#!/usr/bin/env node
/**
 * seed-cli — standalone Firestore seed loader / deleter for LetItRip.
 *
 * Talks directly to Firestore via firebase-admin — does not require the Next.js
 * dev server to be running. Reads Firebase credentials and PII secrets from the
 * consumer project's `.env.local` (resolved against process.cwd()).
 *
 * This mirrors the logic in src/app/api/demo/seed/route.ts. Keep them in sync.
 *
 * Usage (from consumer project root, e.g. d:/proj/letitrip.in):
 *   npx appkit-seed load                       # load all collections
 *   npx appkit-seed load --collections users,categories
 *   npx appkit-seed delete --yes               # purge all (skip confirmation)
 *   npx appkit-seed load --dry-run             # plan without writing
 *   npx appkit-seed status                     # show seed/existing counts
 *
 * Flags:
 *   --collections <a,b,c>   subset of collections (default: all)
 *   --dry-run               compute plan only, no writes
 *   --yes                   skip the destructive-confirm prompt for `delete`
 *   --verbose               log every doc id
 *   --service-account <p>   path to a JSON key file (overrides env vars)
 *
 * Exit: 0 = success, 1 = errors during run, 2 = misconfiguration.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve, basename, dirname } from "node:path";
import { createRequire, register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import readline from "node:readline";

// Register an ESM resolver hook that retries with `.js` / `/index.js` when
// appkit's bundler-target dist emits extension-less relative imports.
const __dirname = dirname(fileURLToPath(import.meta.url));
register("./node-esm-loader.mjs", pathToFileURL(__dirname + "/"));

// ---------------------------------------------------------------------------
// CLI parsing — entry point detects bin name so the same script powers
// `appkit-seed <verb>`, `appkit-seed-add`, and `appkit-seed-remove`.
// ---------------------------------------------------------------------------
const rawArgs = process.argv.slice(2);
const POSITIONAL = rawArgs.filter((a) => !a.startsWith("--"));
function flag(name, fallback = undefined) {
  const i = rawArgs.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = rawArgs[i + 1];
  return v && !v.startsWith("--") ? v : true;
}

const binName = basename(process.argv[1] || "").replace(/\.(mjs|js|cmd|exe|ps1)$/i, "");
const BIN_ACTION_MAP = {
  "appkit-seed-add": "load",
  "appkit-seed-remove": "delete",
  "appkit-seed-status": "status",
};
const ACTION = BIN_ACTION_MAP[binName] ?? POSITIONAL[0];
if (!["load", "delete", "status", "purge"].includes(ACTION)) {
  console.error("usage:");
  console.error("  appkit-seed <load|delete|status|purge> [flags]");
  console.error("  appkit-seed-add     [flags]   # alias for `appkit-seed load`");
  console.error("  appkit-seed-remove  [flags]   # alias for `appkit-seed delete`");
  console.error("");
  console.error("  purge   delete every document whose seedPurpose is \"test\", and NOTHING else.");
  console.error("          Unlike `delete`, which empties whole collections, this keeps real");
  console.error("          content (faqs, categories, taxCodes, productFeatures, blogPosts,");
  console.error("          carousels, homepageSections, siteSettings, the tester checklist) and");
  console.error("          keeps the two keep-list rows: the admin account and store-letitrip-official.");
  console.error("          Organic rows carry no seedPurpose at all and are unreachable by it.");
  console.error("");
  console.error("flags: --collections a,b   --dry-run   --yes   --verbose   --service-account <path>");
  process.exit(2);
}

const ONLY = flag("collections");
const DRY_RUN = flag("dry-run") === true;
const SKIP_CONFIRM = flag("yes") === true;
const VERBOSE = flag("verbose") === true;
const SERVICE_ACCOUNT_OVERRIDE = typeof flag("service-account") === "string" ? flag("service-account") : null;

const ONLY_SET = ONLY && typeof ONLY === "string"
  ? new Set(ONLY.split(",").map((s) => s.trim()))
  : null;

// ---------------------------------------------------------------------------
// .env.local loader (avoids a dotenv dep, same shape as firebase-reset.mjs)
// ---------------------------------------------------------------------------
const repoRoot = process.cwd();
const envLocalPath = resolve(repoRoot, ".env.local");
if (existsSync(envLocalPath)) {
  for (const line of readFileSync(envLocalPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const raw = t.slice(eq + 1).trim();
    const v = raw.replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
  if (VERBOSE) console.log(`✓ Loaded ${envLocalPath}`);
} else {
  console.warn(`⚠ .env.local not found at ${envLocalPath} — relying on existing process.env`);
}

// Validate config
const required = ["FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY"];
const missing = required.filter((k) => !process.env[k]);
if (!SERVICE_ACCOUNT_OVERRIDE && missing.length > 0) {
  console.error(`✗ Missing required env vars: ${missing.join(", ")}`);
  console.error("  Either set them in .env.local or pass --service-account <path-to-key.json>");
  process.exit(2);
}

// PII keys are mandatory for collections that encrypt fields
const PII_REQUIRED = ["users", "addresses", "storeAddresses", "products", "orders", "reviews", "bids", "payouts", "eventEntries"];
// PII_ENCRYPTION_KEY ONLY. `PII_SECRET` used to be accepted here as an
// alternative and is read by no runtime code — so a machine with only that set
// passed this check and then threw at the first encrypt, mid-load, with some
// collections already written.
const PII_KEY_PRESENT = Boolean(process.env.PII_ENCRYPTION_KEY);
if (ACTION === "load" && !PII_KEY_PRESENT) {
  // A hard stop, not a warning. Loading without the key does not skip the PII
  // collections — it writes some and then throws, leaving a half-seeded
  // database that looks like a successful run until someone reads it.
  console.error("✖ PII_ENCRYPTION_KEY is not set — users, addresses, orders, reviews, bids, payouts and eventEntries all encrypt fields at write time.");
  process.exit(2);
}

// ---------------------------------------------------------------------------
// firebase-admin init
// ---------------------------------------------------------------------------
const require = createRequire(import.meta.url);
// appkit's pii-encrypt.ts calls a bare `require("crypto")` at runtime (not a
// static import — deliberately, so bundlers like Turbopack never see a
// node:module dependency and refuse to build the client bundle). A bare
// `require` identifier resolves via the global scope in Node ESM, so it must
// exist as a global before the dynamic `import("@mohasinac/appkit")` below
// ever triggers that code path. Only this standalone-script environment
// needs it — Next.js's own server bundle (webpack/Turbopack) provides an
// ambient `require` automatically.
globalThis.require = require;
const admin = require("firebase-admin");

function parsePrivateKey(raw) {
  if (!raw) return raw;
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

if (!admin.apps.length) {
  if (SERVICE_ACCOUNT_OVERRIDE) {
    const key = JSON.parse(readFileSync(resolve(repoRoot, SERVICE_ACCOUNT_OVERRIDE), "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(key),
      databaseURL: process.env.FIREBASE_ADMIN_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID.trim(),
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL.trim(),
        privateKey: parsePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
      }),
      databaseURL:
        process.env.FIREBASE_ADMIN_DATABASE_URL ||
        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  }
}
const db = admin.firestore();
const auth = admin.auth();
console.log(`✓ Connected to project: ${process.env.FIREBASE_ADMIN_PROJECT_ID || "(service-account)"}`);

// ---------------------------------------------------------------------------
// Pull seed data + helpers from @mohasinac/appkit
// ---------------------------------------------------------------------------
const appkit = await import("@mohasinac/appkit");
// PII crypto functions moved server-only in appkit 3.8.1 (they touch
// firebase-admin's crypto chain) — no longer exported from the main
// client-safe barrel, only from "@mohasinac/appkit/server". The *_PII_FIELDS
// / *_PII_INDEX_MAP constants are plain data and stay in the main barrel.
const appkitServer = await import("@mohasinac/appkit/server");
const { encryptPiiFields, piiIndicesFor, encryptPayoutDetails, encryptPayoutBankAccount, encryptShippingConfig } = appkitServer;

const {
  // seed data
  usersSeedData, addressesSeedData, storeAddressesSeedData,
  // store-extensions — see the SEED_DATA_MAP note below (Root Cause #90, 7-16).
  payoutMethodsSeedData, shippingConfigsSeedData, analyticsCardsSeedData, analyticsAlertsSeedData,
  storeCategoriesSeedData, listingTemplatesSeedData, moderationQueueSeedData, reportsSeedData,
  itemRequestsSeedData, storeGoogleConfigSeedData,
  categoriesSeedData, storesSeedData, sessionsSeedData,
  productsStandardSeedData, productsCatalogueSeedData, productsAuctionsSeedData, productsPreordersSeedData,
  productsPrizeDrawsSeedData, productsClassifiedsSeedData, productsDigitalCodesSeedData, productsLiveItemsSeedData,
  productsArtSeedData, productsStickersSeedData,
  ordersSeedData, reviewsSeedData, cartsSeedData, bidsSeedData,
  couponsSeedData, couponUsageSeedData,
  eventsSeedData, eventEntriesSeedData, payoutsSeedData, offersSeedData,
  notificationsSeedData, blogPostsSeedData,
  carouselsSeedData, carouselSlidesSeedData, homepageSectionsSeedData,
  siteSettingsSeedData, faqSeedData,
  wishlistsSeedData, historySeedData,
  groupedListingsSeedData,
  scammersSeedData, productFeaturesSeedData, taxCodesSeedData,
  partGlossarySeedData, modelCompositionSeedData,
  testerChecklistSeedData, testerResponsesSeedData,
  supportTicketsSeedData, catalogueSeedData,
  shipmentsSeedData, shipmentLotsSeedData, shipmentItemsSeedData,
  // collection constants
  USER_COLLECTION,
  CATEGORIES_COLLECTION, STORE_COLLECTION,
  PRODUCT_COLLECTION, ORDER_COLLECTION, REVIEW_COLLECTION, BID_COLLECTION,
  COUPONS_COLLECTION, CAROUSELS_COLLECTION, CAROUSEL_SLIDES_COLLECTION,
  HOMEPAGE_SECTIONS_COLLECTION, SITE_SETTINGS_COLLECTION, FAQS_COLLECTION,
  NOTIFICATIONS_COLLECTION, PAYOUT_COLLECTION, OFFER_COLLECTION, BLOG_POSTS_COLLECTION,
  EVENTS_COLLECTION, EVENT_ENTRIES_COLLECTION, SESSION_COLLECTION,
  CART_COLLECTION,
  GROUPED_LISTINGS_COLLECTION, SCAMMER_COLLECTION,
  WISHLIST_COLLECTION, HISTORY_COLLECTION, PRODUCT_FEATURES_COLLECTION,
  TAX_CODES_COLLECTION,
  PART_GLOSSARY_COLLECTION,
  MODEL_COMPOSITION_COLLECTION,
  TESTER_CHECKLIST_ITEM_COLLECTION,
  TESTER_CHECKLIST_RESPONSE_COLLECTION,
  // PII field/index constants (plain data, still in the main barrel — the
  // crypto functions themselves come from appkitServer above)
  USER_PII_FIELDS, USER_PII_INDEX_MAP,
  ADDRESS_PII_FIELDS, ORDER_PII_FIELDS, BID_PII_FIELDS, PAYOUT_PII_FIELDS,
  REVIEW_PII_FIELDS, OFFER_PII_FIELDS, EVENT_ENTRY_PII_FIELDS,
  // misc
  generateFAQId,
  /*
   * Seed provenance. `stampSeedPurpose` is the ONE place a `seedPurpose` (and
   * the `isTestData` / `testDataExpiresAt` derived from it) is produced, shared
   * with `seed/runner.ts` so the two loaders cannot disagree about what a
   * purpose means — Root Cause #75's shape on the seed axis.
   */
  stampSeedPurpose,
  resolveSeedPurpose,
  SEED_COLLECTION_PURPOSE,
  ALL_SEED_PURPOSES,
} = appkit;

// ---------------------------------------------------------------------------
// Collection registry
// ---------------------------------------------------------------------------
const COLLECTION_MAP = {
  users: USER_COLLECTION,
  addresses: "addresses",
  storeAddresses: "storeAddresses",
  couponUsage: "couponUsage",
  categories: CATEGORIES_COLLECTION,
  stores: STORE_COLLECTION,
  products: PRODUCT_COLLECTION,
  orders: ORDER_COLLECTION,
  reviews: REVIEW_COLLECTION,
  bids: BID_COLLECTION,
  coupons: COUPONS_COLLECTION,
  carousels: CAROUSELS_COLLECTION,
  carouselSlides: CAROUSEL_SLIDES_COLLECTION,
  homepageSections: HOMEPAGE_SECTIONS_COLLECTION,
  siteSettings: SITE_SETTINGS_COLLECTION,
  faqs: FAQS_COLLECTION,
  notifications: NOTIFICATIONS_COLLECTION,
  payouts: PAYOUT_COLLECTION,
  offers: OFFER_COLLECTION,
  /*
   * String literals, not constants, because SUPPORT_TICKET_COLLECTION,
   * CATALOGUE_COLLECTION and SHIPMENT_COLLECTION are NOT re-exported from
   * appkit's barrel -- only their features' own schema files declare them.
   * Adding three barrel exports to fix a seeding gap is a public-API change
   * for a private need, so the names are duplicated here with the source
   * named beside each. If one is ever renamed, this is the site that breaks.
   */
  supportTickets: "supportTickets",          // features/support/schemas/firestore.ts:279
  catalogueItems: "catalogueItems",          // features/catalogue/schemas/firestore.ts:18
  procurementShipments: "procurementShipments", // features/shipments/schemas/firestore.ts:26
  shipmentLots: "shipmentLots",
  shipmentItems: "shipmentItems",
  /*
   * store-extensions. Ten collections with seed fixtures in manifest.ts that
   * were NEVER in this map, so ALL_COLLECTIONS omitted them and they held ZERO
   * documents in every run ever -- Root Cause #90, instances 7-16. Found via
   * /store/analytics/cards rendering "No cards" under copy promising built-ins.
   * String literals for the same reason as the block above: none of these is
   * re-exported from appkit's barrel.
   */
  payoutMethods: "payoutMethods",           // features/store-extensions/schemas/firestore.ts:46
  shippingConfigs: "shippingConfigs",       // :84
  analyticsCards: "analyticsCards",         // :120
  analyticsAlerts: "analyticsAlerts",       // :152
  storeCategories: "storeCategories",       // :179
  listingTemplates: "listingTemplates",     // :240
  moderationQueue: "moderationQueue",       // :280
  reports: "reports",                       // :372
  itemRequests: "itemRequests",
  storeGoogleConfig: "storeGoogleConfig",
  blogPosts: BLOG_POSTS_COLLECTION,
  events: EVENTS_COLLECTION,
  eventEntries: EVENT_ENTRIES_COLLECTION,
  sessions: SESSION_COLLECTION,
  carts: CART_COLLECTION,
  wishlists: WISHLIST_COLLECTION,
  history: HISTORY_COLLECTION,
  groupedListings: GROUPED_LISTINGS_COLLECTION,
  scammerProfiles: SCAMMER_COLLECTION,
  productFeatures: PRODUCT_FEATURES_COLLECTION,
  taxCodes: TAX_CODES_COLLECTION,
  // E4/D12 — extracted from the local corpus, generated into the seed.
  partGlossary: PART_GLOSSARY_COLLECTION,
  modelComposition: MODEL_COMPOSITION_COLLECTION,
  testerChecklistItems: TESTER_CHECKLIST_ITEM_COLLECTION,
  /*
   * Tester submissions. DERIVED tier in the tester's own map (wiped at setup so
   * a prior run's verdicts never leak into the next), AND listed in
   * SEED_TRANSACTIONAL so these two demo fixtures are restored afterwards —
   * that list is a RESTORE list, orthogonal to the delete tiers.
   *
   * Without the fixtures, three admin/bug-hunter-rewards cases have nothing to
   * confirm or reopen and can only report blocked. Measured 2026-09-11:
   * 0 pass / 0 fail / 5 blocked, both controls correct.
   */
  testerChecklistResponses: TESTER_CHECKLIST_RESPONSE_COLLECTION,
};

/*
 * B6 — stamp `gstRate` + `hsnCode` onto every seeded product.
 *
 * 🛑 WITHOUT THIS, EVERY SEEDED PRODUCT IS TAXED AT ZERO, and the Tax row can
 * never render no matter what the GSTIN says.
 *
 * The resolution order C0c settled lives in `ProductRepository.deriveTaxonomy`
 * — product rate, else the CATEGORY's via `taxCodeId`, else a warned floor —
 * and it runs on a repository write. **The seed writes through
 * `set(..., { merge: true })` and never touches the repository**, so no seeded
 * row has ever carried a rate: measured 2026-10-12, `gstRate` was absent on
 * all 70 live products. At checkout `sumGroupGst` reads `product.gstRate`
 * directly with a `?? 0`, so the whole catalogue would have computed GST = 0
 * with a valid GSTIN and `gstSettings.enabled: true`.
 *
 * That is the same class as Root Cause #101 (a schema that strips a field plus
 * a read-side backfill equals a field no query can see) — here it is a
 * write-side derivation the seed path does not run.
 *
 * 🛑 This is NOT a second implementation of the resolution. The product seed
 * already hand-writes the FULL `categorySlugs` chain, so there is no walk to
 * re-derive: take the chain, find the first element whose category declares a
 * `taxCodeId`, and read the rate off the `taxCodes` seed. Nearest-first, which
 * is the order `resolveCategoryDefaults` uses, so a more specific category
 * still wins.
 *
 * 🛑 An explicit rate on a product WINS and is never overwritten — including
 * `gstRate: 0`, which is a deliberate exemption and not an absence
 * (`ProductDocument.gstRate`'s own JSDoc: "undefined and 0 MEAN DIFFERENT
 * THINGS"). The test is `== null`, never falsy.
 *
 * 🛑 And it REFUSES rather than defaulting. A product whose chain resolves no
 * tax code throws at load time: C0c defines reaching the floor as a triage
 * signal, so a silent 5% here would hide exactly what it is meant to surface —
 * and a wrong rate on a real invoice is worse than a failed load.
 */
function withDerivedCategoryFields(products) {
  const catById = new Map((categoriesSeedData || []).map((c) => [String(c.id), c]));
  const taxById = new Map((taxCodesSeedData || []).map((t) => [String(t.id), t]));
  const unresolved = [];
  const out = products.map((p) => {
    // 🛑 Must NOT early-exit on tax alone now that authenticity rides along —
    // a product with a hand-written rate would silently keep no authenticity.
    if (p.gstRate != null && p.hsnCode && p.authenticity) return p;
    const chain = Array.isArray(p.categorySlugs) && p.categorySlugs.length
      ? p.categorySlugs
      : (p.category ? [p.category] : []);
    let code = null;
    for (const id of chain) {
      const c = catById.get(String(id));
      const t = c?.productDefaults?.taxCodeId;
      if (t) { code = t; break; }
    }
    const tax = code ? taxById.get(String(code)) : null;
    if (!tax) { unresolved.push(`${p.id} (leaf ${chain[0] ?? "none"})`); return p; }

    /*
     * 🛑 AUTHENTICITY, the same gap one field over — and it was making a HERO
     * CLAIM false.
     *
     * `productDefaults.defaultAuthenticity` is declared on 122 categories and
     * `authenticity` was absent on **all 71 live products**, because it derives
     * on a repository write and the seed does not make one. The homepage
     * authenticity slide says "the seller has to pick one before it can go
     * live" — which was untrue in two ways at once: the write schema has it
     * `.optional()`, and not one product carried a value.
     *
     * `unverified` is the floor, never `original`: `ProductAuthenticity`'s own
     * docstring says that without it "an honest seller who does not know would
     * have to pick 'original', and silence would be indistinguishable from a
     * genuine claim." The platform must not make an authenticity claim nobody
     * checked.
     *
     * An explicit product value always wins, so the 6 categories that declare
     * `original` still reach their products.
     */
    let authenticity = null;
    for (const id of chain) {
      const c = catById.get(String(id));
      const a = c?.productDefaults?.defaultAuthenticity;
      if (a) { authenticity = a; break; }
    }

    return {
      ...p,
      gstRate: p.gstRate != null ? p.gstRate : tax.gstRate,
      // An exempt code has no HSN, and `hsnCode: ""` would read as a declared
      // empty code rather than as an inapplicable one.
      ...(p.hsnCode || !tax.hsnCode ? {} : { hsnCode: tax.hsnCode }),
      ...(p.authenticity || !authenticity ? {} : { authenticity }),
    };
  });
  if (unresolved.length) {
    const detail = unresolved.slice(0, 10).join(", ");
    throw new Error(
      `seed: ${unresolved.length} product(s) resolve NO taxCodeId from their category chain, ` +
        "so they would be taxed at zero. Give the category a taxCodeId " +
        `(the roots carry a floor - see ROOT_TAX_DEFAULTS): ${detail}`,
    );
  }
  return out;
}

const SEED_DATA_MAP = {
  users: usersSeedData,
  /*
   * store-extensions. COLLECTION_MAP was only HALF the wiring: load() reads
   * SEED_DATA_MAP and short-circuits on an empty array, so adding the ten
   * collection names alone produced "no seed data, skipping" for all ten.
   * Same shape as the art/stickers note further down -- added everywhere
   * except the map that actually runs.
   */
  payoutMethods: payoutMethodsSeedData,
  shippingConfigs: shippingConfigsSeedData,
  analyticsCards: analyticsCardsSeedData,
  analyticsAlerts: analyticsAlertsSeedData,
  storeCategories: storeCategoriesSeedData,
  listingTemplates: listingTemplatesSeedData,
  moderationQueue: moderationQueueSeedData,
  reports: reportsSeedData,
  itemRequests: itemRequestsSeedData,
  storeGoogleConfig: storeGoogleConfigSeedData,
  addresses: addressesSeedData,
  storeAddresses: storeAddressesSeedData,
  // SB-UNI-C: brands were merged into categories (categoryType:"brand") — no
  // standalone brands collection/seed exists anymore.
  categories: categoriesSeedData,
  stores: storesSeedData,
  products: withDerivedCategoryFields([
    ...(productsStandardSeedData || []), ...(productsCatalogueSeedData || []), ...(productsAuctionsSeedData || []), ...(productsPreordersSeedData || []),
    ...(productsPrizeDrawsSeedData || []), ...(productsClassifiedsSeedData || []), ...(productsDigitalCodesSeedData || []), ...(productsLiveItemsSeedData || []),
    // art + stickers were written, exported from the seed barrel, and then never
    // spread here — so 13 fixtures had NEVER reached the database, /art and
    // /stickers were permanently empty, and listingType=art|stickers returned 0.
    // Root Cause #58's family one layer down: added everywhere except the runner.
    ...(productsArtSeedData || []), ...(productsStickersSeedData || []),
  ]),
  orders: ordersSeedData,
  reviews: reviewsSeedData,
  bids: bidsSeedData,
  coupons: couponsSeedData,
  couponUsage: couponUsageSeedData,
  carousels: carouselsSeedData,
  carouselSlides: carouselSlidesSeedData,
  homepageSections: homepageSectionsSeedData,
  siteSettings: [siteSettingsSeedData],
  faqs: faqSeedData,
  notifications: notificationsSeedData,
  payouts: payoutsSeedData,
  // The LOADER was missing for a long time, so `offers` never appeared in
  // `appkit-seed status` and no run had an offer in Firestore. OFFER_PII_FIELDS
  // was already imported and mapped below -- the PII half was wired and the
  // loading half never was, which is why the gap looked like support rather
  // than an omission.
  offers: offersSeedData,
  // All four were unregistered like offers, all measured at 0 documents live.
  // They are UNLISTED in the tester's tier map, which means PRESERVE -- so
  // seeding them once persists across every future run rather than being
  // wiped by the next tester:setup.
  supportTickets: supportTicketsSeedData,
  catalogueItems: catalogueSeedData,
  procurementShipments: shipmentsSeedData,
  shipmentLots: shipmentLotsSeedData,
  shipmentItems: shipmentItemsSeedData,
  blogPosts: blogPostsSeedData,
  events: eventsSeedData,
  eventEntries: eventEntriesSeedData,
  sessions: sessionsSeedData,
  carts: cartsSeedData,
  wishlists: wishlistsSeedData,
  history: historySeedData,
  groupedListings: groupedListingsSeedData,
  scammerProfiles: scammersSeedData,
  productFeatures: productFeaturesSeedData,
  taxCodes: taxCodesSeedData,
  partGlossary: partGlossarySeedData,
  modelComposition: modelCompositionSeedData,
  testerChecklistItems: testerChecklistSeedData,
  testerChecklistResponses: testerResponsesSeedData,
};

const ALL_COLLECTIONS = Object.keys(COLLECTION_MAP);
const REPLACE_ON_LOAD = new Set(["homepageSections", "carouselSlides"]);

const collectionsToProcess = ONLY_SET
  ? ALL_COLLECTIONS.filter((c) => ONLY_SET.has(c))
  : ALL_COLLECTIONS;

if (ONLY_SET && collectionsToProcess.length === 0) {
  console.error(`✗ No matching collections. Valid: ${ALL_COLLECTIONS.join(", ")}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------
function stripUndefined(obj) {
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (obj instanceof Date) return obj;
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => [k, stripUndefined(v)]),
    );
  }
  return obj;
}

async function purgeCollection(path) {
  const BATCH = 500;
  let snap = await db.collection(path).limit(BATCH).get();
  let removed = 0;
  while (!snap.empty) {
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    removed += snap.docs.length;
    if (snap.docs.length < BATCH) break;
    snap = await db.collection(path).limit(BATCH).get();
  }
  return removed;
}

function encryptSeedPii(collection, data) {
  const PII_MAP = {
    orders: ORDER_PII_FIELDS,
    bids: BID_PII_FIELDS,
    payouts: PAYOUT_PII_FIELDS,
    reviews: REVIEW_PII_FIELDS,
    products: ["sellerName", "sellerEmail"],
    offers: OFFER_PII_FIELDS,
    eventEntries: EVENT_ENTRY_PII_FIELDS,
  };
  const fields = PII_MAP[collection];
  if (!fields) return data;
  let result = encryptPiiFields(data, [...fields]);
  if (collection === "payouts" && result.bankAccount) {
    result.bankAccount = encryptPayoutBankAccount(result.bankAccount);
  }
  return result;
}

async function countExisting(colName) {
  const seed = SEED_DATA_MAP[colName] || [];
  if (seed.length === 0) return 0;

  if (colName === "addresses") {
    // SB-UNI-A: top-level `addresses` collection, not users/{uid}/addresses.
    const refs = seed.filter((d) => d.id).map((d) => db.collection("addresses").doc(d.id));
    if (refs.length === 0) return 0;
    const snaps = await db.getAll(...refs);
    return snaps.filter((s) => s.exists).length;
  }
  if (colName === "storeAddresses") {
    // Also lands in the top-level `addresses` collection (see loadStoreAddresses).
    const refs = seed.filter((d) => d.id).map((d) => db.collection("addresses").doc(d.id));
    if (refs.length === 0) return 0;
    const snaps = await db.getAll(...refs);
    return snaps.filter((s) => s.exists).length;
  }
  if (colName === "couponUsage") {
    const refs = seed.filter((d) => d.userId && d.couponId).map((d) =>
      db.collection(USER_COLLECTION).doc(d.userId).collection("couponUsage").doc(d.couponId));
    if (refs.length === 0) return 0;
    const snaps = await db.getAll(...refs);
    return snaps.filter((s) => s.exists).length;
  }
  if (colName === "wishlists" || colName === "history") {
    const refs = seed.filter((d) => d.id).map((d) => db.collection(COLLECTION_MAP[colName]).doc(d.id));
    if (refs.length === 0) return 0;
    const snaps = await db.getAll(...refs);
    return snaps.filter((s) => s.exists).length;
  }
  if (colName === "siteSettings") {
    const snap = await db.collection(COLLECTION_MAP[colName]).doc("global").get();
    return snap.exists ? 1 : 0;
  }
  if (colName === "users") {
    const refs = seed.filter((d) => d.uid).map((d) => db.collection(COLLECTION_MAP[colName]).doc(d.uid));
    if (refs.length === 0) return 0;
    const snaps = await db.getAll(...refs);
    return snaps.filter((s) => s.exists).length;
  }
  if (colName === "faqs") {
    // Mirrors loadGeneric: prefer the explicit id (every current faq record has
    // one), only derive via generateFAQId for a record that genuinely lacks one.
    const refs = seed.map((faq) => {
      const id = faq.id ?? generateFAQId({ category: faq.category, question: faq.question });
      return db.collection(COLLECTION_MAP[colName]).doc(id);
    });
    if (refs.length === 0) return 0;
    const snaps = await db.getAll(...refs);
    return snaps.filter((s) => s.exists).length;
  }
  // Mirrors loadGeneric's docId = id ?? slug resolution.
  const refs = seed.filter((d) => d.id ?? d.slug).map((d) => db.collection(COLLECTION_MAP[colName]).doc(d.id ?? d.slug));
  if (refs.length === 0) return 0;
  const snaps = await db.getAll(...refs);
  return snaps.filter((s) => s.exists).length;
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------
async function cmdStatus() {
  console.log(`\n${"collection".padEnd(22)} ${"seed".padStart(6)} ${"in db".padStart(6)}`);
  console.log("─".repeat(40));
  for (const c of collectionsToProcess) {
    const seedCount = (SEED_DATA_MAP[c] || []).length;
    const existing = await countExisting(c).catch((e) => { console.error(`  err: ${c}: ${e.message}`); return 0; });
    const marker = existing === seedCount ? "✓" : existing === 0 ? " " : "~";
    console.log(`${marker} ${c.padEnd(20)} ${String(seedCount).padStart(6)} ${String(existing).padStart(6)}`);
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Confirm prompt
// ---------------------------------------------------------------------------
async function confirm(msg) {
  if (SKIP_CONFIRM) return true;
  return new Promise((resolveP) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${msg} [y/N] `, (a) => { rl.close(); resolveP(/^y(es)?$/i.test(a.trim())); });
  });
}

// ---------------------------------------------------------------------------
// Per-collection writers (mirror of /api/demo/seed POST)
// ---------------------------------------------------------------------------
async function resolveAuthConflicts(uid, authUserData) {
  if (authUserData.email) {
    try {
      const conflict = await auth.getUserByEmail(authUserData.email);
      if (conflict.uid !== uid) await auth.deleteUser(conflict.uid);
    } catch (e) { if (e?.code !== "auth/user-not-found") throw e; }
  }
  if (authUserData.phoneNumber) {
    try {
      const conflict = await auth.getUserByPhoneNumber(authUserData.phoneNumber);
      if (conflict.uid !== uid) await auth.deleteUser(conflict.uid);
    } catch (e) { if (e?.code !== "auth/user-not-found") throw e; }
  }
}

async function loadUsers(seed, stats) {
  for (const u of seed) {
    try {
      const { uid, email, phoneNumber, displayName, photoURL, emailVerified, disabled } = u;
      const docRef = db.collection(USER_COLLECTION).doc(uid);
      let userExists = false;
      try { await auth.getUser(uid); userExists = true; }
      catch (e) { if (e.code !== "auth/user-not-found") throw e; }

      const authUserData = { displayName, emailVerified, disabled };
      if (email && typeof email === "string") authUserData.email = email;
      if (phoneNumber && typeof phoneNumber === "string") authUserData.phoneNumber = phoneNumber;
      // Firebase Auth's photoURL field requires an absolute URL. Seed data's
      // photoURL is wrapped by seedExtMedia() into a relative /media/ext?url=...
      // app-proxy path — valid for Firestore + the app's own avatar rendering,
      // but auth.createUser()/updateUser() reject it with "must be a valid URL"
      // and abort the WHOLE user record (Auth + Firestore both skipped) before
      // ever reaching the Firestore write below. The app never reads Auth's own
      // photoURL copy anyway — it always resolves avatars via the Firestore
      // users doc — so just skip setting it on the Auth record for relative
      // paths instead of failing the entire seed row.
      if (photoURL && typeof photoURL === "string" && /^https?:\/\//.test(photoURL)) {
        authUserData.photoURL = photoURL;
      }

      if (!userExists) {
        await resolveAuthConflicts(uid, authUserData);
        await auth.createUser({ uid, ...authUserData, password: "TempPass123!" });
      }
      if (u.role && u.role !== "user") {
        await auth.setCustomUserClaims(uid, { role: u.role });
      }

      // Both arguments read the PLAINTEXT `plain`: indices must be hashed from
      // the source text, and encryption must not see an already-hashed value.
      // The previous form relied on ordering alone (indices first, THEN
      // encrypt) — correct, but one line-swap away from spreading plaintext
      // back over ciphertext, which is why `addPiiIndices` no longer exists.
      /*
       * 🛑 Provenance is stamped here too, and `users` is the collection the
       * whole scheme exists for.
       *
       * It had no permanence marker of any kind, so a seeded persona could not
       * be told apart from a real signup — and a seeded user is the most
       * expensive thing to delete wrongly: it owns an **Auth record**, a
       * `userSlugs` index entry, addresses, a cart, orders, bids and reviews,
       * and `users` sits in the tester harness's PRESERVE tier precisely
       * because a wrong sweep there is the only permanent damage a run can do.
       *
       * Stamped before the PII pass so `plain` carries it: the indices are
       * hashed from plaintext and the encryption must not see a hashed value,
       * so nothing may be added to `docData` after that pair runs.
       */
      const plain = stripUndefined(stampSeedPurpose("users", { ...u }));
      let docData = {
        ...encryptPiiFields(plain, [...USER_PII_FIELDS]),
        ...piiIndicesFor(plain, USER_PII_INDEX_MAP),
      };
      if (docData.payoutDetails) docData.payoutDetails = encryptPayoutDetails(docData.payoutDetails);
      if (docData.shippingConfig) docData.shippingConfig = encryptShippingConfig(docData.shippingConfig);
      await docRef.set(docData, { merge: true });
      stats.created++;
      if (VERBOSE) console.log(`    + ${uid}`);
    } catch (err) {
      console.error(`    ✗ user ${u.uid}: ${err.message}`);
      stats.errors++;
    }
  }
}

async function loadSubcollection(seed, parentColl, parentKey, subColl, idKey, piiFields, stats) {
  for (const d of seed) {
    try {
      const parent = d[parentKey];
      const id = d[idKey];
      if (!parent || !id) { stats.errors++; continue; }
      const { [parentKey]: _p, [idKey]: _i, ...data } = d;
      const docRef = db.collection(parentColl).doc(parent).collection(subColl).doc(id);
      /*
       * Subcollection rows inherit the SUBCOLLECTION's purpose, not the
       * parent's — `subColl` is the key in `SEED_COLLECTION_PURPOSE`. A
       * `couponUsage` row under a permanent user is still its own record, and
       * conflating the two would make a parent's classification silently
       * govern children it knows nothing about.
       */
      const stamped = stripUndefined(stampSeedPurpose(subColl, data));
      const payload = piiFields ? encryptPiiFields(stamped, [...piiFields]) : stamped;
      await docRef.set(payload, { merge: true });
      stats.created++;
    } catch (err) { console.error(`    ✗ ${err.message}`); stats.errors++; }
  }
}

async function loadOneDocPerUser(seed, coll, stats) {
  for (const d of seed) {
    try {
      const { id, userId, items, updatedAt } = d;
      if (!id || !userId) { stats.errors++; continue; }
      /*
       * 🛑 `merge: false` — this loader REPLACES the document, which is correct
       * for a wishlist or a history list (the array IS the record), and is
       * exactly why the stamp has to be inside the payload rather than added
       * by a later merge-write that would be wiped on the next load.
       *
       * `coll` is the real Firestore collection name here rather than the seed
       * key, and for `wishlists`/`history` the two are identical — the only two
       * callers. `resolveSeedPurpose` falls back to `permanent` if that ever
       * stops being true, which is the safe direction.
       */
      await db.collection(coll).doc(id).set(
        stripUndefined(
          stampSeedPurpose(coll, {
            userId,
            items: items ?? [],
            updatedAt: updatedAt ?? new Date(),
          }),
        ),
        { merge: false },
      );
      stats.created++;
    } catch (err) { console.error(`    ✗ ${err.message}`); stats.errors++; }
  }
}

async function loadGeneric(colName, seed, firestoreCollection, stats) {
  if (REPLACE_ON_LOAD.has(colName)) {
    const removed = await purgeCollection(firestoreCollection);
    if (VERBOSE) console.log(`    purged ${removed} pre-existing docs`);
  }
  const items = [];
  for (const docData of seed) {
    let { id, ...data } = docData;
    if (!id && colName === "faqs") {
      id = generateFAQId({ category: docData.category, question: docData.question });
      if (!id) { stats.errors++; continue; }
    } else if (!id) { stats.errors++; continue; }
    // `id` already carries the project's mandatory slug prefix (blog-, event-,
    // faq-, etc. — see CLAUDE.md's Slug Prefix System). Preferring the bare
    // `slug` field here (as this used to) wrote every blogPosts/events doc
    // under its unprefixed slug instead, e.g. "auction-feature-launch"
    // instead of "blog-auction-feature-launch" — found 2026-08-17 auditing
    // real Firestore doc IDs after a full reseed.
    const docId = id ?? docData.slug;
    if (!data.slug) data.slug = docData.slug ?? docId;
    items.push({
      ref: db.collection(firestoreCollection).doc(docId),
      /*
       * 🛑 Stamp provenance BEFORE `stripUndefined`, not after.
       *
       * `seedPurposeFields` deliberately OMITS `isTestData` for a `permanent`
       * row rather than writing `false` — so stamping afterwards would be
       * indistinguishable from not stamping, and stripping afterwards is what
       * keeps the absence genuine instead of writing `undefined` keys.
       *
       * One call, one choke point: every one of the ~2,500 documents this
       * loader writes gets a `seedPurpose`, so the purge is a query rather than
       * a heuristic, and `users`/`orders` are reachable by it for the first
       * time.
       */
      /*
       * 🛑 `docId` is passed EXPLICITLY because this loader destructures `id`
       * out (`let { id, ...data } = docData`), so the row it hands over has no
       * id for the per-row overrides to match on. Measured without it:
       * `store-letitrip-official` loaded as `test` — the platform's own store,
       * which is one of exactly two rows the keep-list exists to protect.
       */
      data: encryptSeedPii(colName, stripUndefined(stampSeedPurpose(colName, data, docId))),
    });
  }
  /*
   * 🛑 Chunk by INDEX ENTRIES, not just by operation count.
   *
   * This loop capped at 500 operations and nothing else. That was invisible for
   * years because every seeded collection had small documents; B5's 416
   * categories are the first that do not. Measured 2026-10-11: one 416-op
   * commit failed with `INVALID_ARGUMENT: Transaction too big` and wrote
   * **0 of 416** — not a partial load, nothing at all.
   *
   * 🛑 The failure mode is what makes this worth a real fix rather than a
   * retry: `✓ Load complete — created 2097, errors 1` reads as a near-complete
   * run, and the ONE missing collection was the taxonomy that every product's
   * `categorySlugs` chain points into. A purge-then-load left 70 products
   * referencing ids that did not exist, with a cheerful summary line.
   *
   * ## What actually binds, measured by bisection rather than assumed
   *
   * My first fix capped PAYLOAD BYTES, on the theory that these documents are
   * large. They are not: 416 categories are **1.51 MiB total**, mean 3.7 KiB,
   * largest 7.9 KiB — nowhere near the 10 MiB request limit, and the byte cap
   * never once triggered. The commit failed anyway.
   *
   * Bisecting the op count found the real boundary, and counting array elements
   * explains it exactly:
   *
   *     416 ops -> 60,787 array elements -> FAILS
   *     250 ops -> 42,912               -> FAILS
   *     100 ops -> 17,578               -> works
   *      50 ops ->  8,791               -> works
   *
   * The threshold sits right at **40,000**, which is Firestore's documented
   * maximum index entries — applied per COMMIT here, not per document. Every
   * element of an indexed array is an index entry, and a category carries ~146
   * of them (`searchTxt` alone is ~150 tokens, plus `parentIds`, `ancestors`,
   * `categoryNames`, `faqs`, `highlights`, `descriptionTemplates`).
   *
   * So the cap is on array elements at **20,000** — half the real limit, the
   * same margin the byte cap keeps — and it is kept alongside the op and byte
   * caps rather than replacing them, because all three are real Firestore
   * limits and only one of them has bitten so far.
   *
   * 🛑 Do NOT "simplify" this back to a lower fixed op count. 100 would work
   * for categories and silently triple the commit count for `faqs` and the
   * 1,337 tester checklist items, which carry almost no arrays. The cap has to
   * key on the thing that varies.
   */
  const MAX_OPS = Number(process.env.SEED_BATCH_OPS ?? 500);
  const MAX_BYTES = 4 * 1024 * 1024;
  const MAX_INDEX_ENTRIES = Number(process.env.SEED_BATCH_INDEX_ENTRIES ?? 20_000);

  /** Array elements, recursively — a proxy for index entries written. */
  const countArrayElements = (v) => {
    if (Array.isArray(v)) return v.length + v.reduce((s, x) => s + countArrayElements(x), 0);
    if (v && typeof v === "object" && !(v instanceof Date)) {
      return Object.values(v).reduce((s, x) => s + countArrayElements(x), 0);
    }
    return 0;
  };

  let chunk = [];
  let chunkBytes = 0;
  let chunkEntries = 0;
  const flush = async () => {
    if (chunk.length === 0) return;
    const batch = db.batch();
    for (const { ref, data } of chunk) batch.set(ref, data, { merge: true });
    await batch.commit();
    stats.created += chunk.length;
    chunk = [];
    chunkBytes = 0;
    chunkEntries = 0;
  };

  for (const item of items) {
    let size = 0;
    try {
      size = Buffer.byteLength(JSON.stringify(item.data), "utf8");
    } catch {
      /*
       * A payload that cannot be serialised cannot be measured. Treat it as a
       * whole chunk's worth rather than as zero — guessing small is how a
       * commit silently grows past a limit again, and a document that resists
       * measurement is the one most likely to be large.
       */
      size = MAX_BYTES;
    }
    const entries = countArrayElements(item.data);
    /*
     * A single document over any cap still has to be written, and alone: a
     * one-document commit is the smallest thing committable, so if Firestore
     * rejects THAT the document itself is the problem and the error says so,
     * rather than the failure being absorbed into a chunking bug.
     */
    if (
      chunk.length > 0 &&
      (chunk.length >= MAX_OPS ||
        chunkBytes + size > MAX_BYTES ||
        chunkEntries + entries > MAX_INDEX_ENTRIES)
    ) {
      await flush();
    }
    chunk.push(item);
    chunkBytes += size;
    chunkEntries += entries;
  }
  await flush();
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------
async function cmdLoad() {
  if (DRY_RUN) return cmdDryRun("load");

  const stats = { created: 0, deleted: 0, skipped: 0, errors: 0 };
  for (const colName of collectionsToProcess) {
    const seed = SEED_DATA_MAP[colName];
    if (!seed || seed.length === 0) { console.log(`▌ ${colName} — no seed data, skipping`); continue; }
    console.log(`▌ ${colName} (${seed.length} docs)`);

    try {
      if (colName === "users") {
        await loadUsers(seed, stats);
      } else if (colName === "addresses") {
        // SB-UNI-A (2026-05-13) unified addresses into one top-level collection
        // with an ownerType/ownerId discriminator, replacing the two prior
        // subcollections (users/{uid}/addresses, stores/{slug}/addresses) this
        // loader used to write to. addressesSeedData already carries
        // ownerType/ownerId directly — write it straight to the top-level
        // collection instead of nesting under USER_COLLECTION's old subcollection.
        for (const d of seed) {
          try {
            const { id, ownerType, ownerId, ...data } = d;
            if (!id || !ownerType || !ownerId) { stats.errors++; continue; }
            const payload = encryptPiiFields(
              stripUndefined(stampSeedPurpose("addresses", { ownerType, ownerId, ...data }, id)),
              [...ADDRESS_PII_FIELDS],
            );
            await db.collection("addresses").doc(id).set(payload, { merge: true });
            stats.created++;
          } catch (err) { console.error(`    ✗ ${err.message}`); stats.errors++; }
        }
      } else if (colName === "storeAddresses") {
        // storeAddressesSeedData predates the SB-UNI-A unification and still
        // carries the old storeSlug field instead of ownerType/ownerId — derive
        // the unified shape at load time rather than writing to the deleted
        // stores/{slug}/addresses subcollection.
        for (const d of seed) {
          try {
            const { id, storeSlug, ...data } = d;
            if (!id || !storeSlug) { stats.errors++; continue; }
            /*
             * Stamped under the SEED KEY `storeAddresses`, not the target
             * collection `addresses`. Both resolve `test`, so nothing differs
             * today — but the purpose table is keyed on the seed key, and
             * stamping under the write target would make the two disagree the
             * day one of them changes.
             */
            const payload = encryptPiiFields(
              stripUndefined(
                stampSeedPurpose("storeAddresses", { ownerType: "store", ownerId: storeSlug, ...data }, id),
              ),
              [...ADDRESS_PII_FIELDS],
            );
            await db.collection("addresses").doc(id).set(payload, { merge: true });
            stats.created++;
          } catch (err) { console.error(`    ✗ ${err.message}`); stats.errors++; }
        }
      } else if (colName === "couponUsage") {
        // shape: { userId, couponId, ... } — no PII
        for (const d of seed) {
          try {
            const { userId, couponId, ...data } = d;
            if (!userId || !couponId) { stats.errors++; continue; }
            await db.collection(USER_COLLECTION).doc(userId).collection("couponUsage").doc(couponId)
              .set(
                stripUndefined(stampSeedPurpose("couponUsage", { couponId, ...data }, couponId)),
                { merge: true },
              );
            stats.created++;
          } catch (err) { console.error(`    ✗ ${err.message}`); stats.errors++; }
        }
      } else if (colName === "wishlists") {
        await loadOneDocPerUser(seed, WISHLIST_COLLECTION, stats);
      } else if (colName === "history") {
        await loadOneDocPerUser(seed, HISTORY_COLLECTION, stats);
      } else if (colName === "siteSettings") {
        const settings = seed[0];
        if (settings) {
          await db.collection(SITE_SETTINGS_COLLECTION).doc("global").set(
          stripUndefined(stampSeedPurpose("siteSettings", settings, "global")), { merge: true });
          stats.created++;
        }
      } else {
        await loadGeneric(colName, seed, COLLECTION_MAP[colName], stats);
      }
    } catch (err) {
      console.error(`✗ ${colName}: ${err.message}`);
      stats.errors++;
    }
  }

  console.log(`\n✓ Load complete — created ${stats.created}, errors ${stats.errors}\n`);
  process.exit(stats.errors > 0 ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
async function cmdDelete() {
  if (DRY_RUN) return cmdDryRun("delete");

  if (!(await confirm(`This will purge ${collectionsToProcess.length} collection(s) in project '${process.env.FIREBASE_ADMIN_PROJECT_ID}'. Continue?`))) {
    console.log("Aborted."); process.exit(0);
  }

  const PROTECTED_USER_UIDS = new Set(["user-admin-letitrip"]);
  const stats = { deleted: 0, skipped: 0, errors: 0 };

  for (const colName of collectionsToProcess) {
    console.log(`▌ ${colName}`);
    const seed = SEED_DATA_MAP[colName] || [];
    try {
      if (colName === "users") {
        for (const u of seed) {
          if (PROTECTED_USER_UIDS.has(u.uid)) { stats.skipped++; continue; }
          try { await auth.deleteUser(u.uid); }
          catch (e) { if (e?.code !== "auth/user-not-found") console.error(`    auth: ${e.message}`); }
          const ref = db.collection(USER_COLLECTION).doc(u.uid);
          if ((await ref.get()).exists) { await ref.delete(); stats.deleted++; }
        }
      } else if (colName === "addresses" || colName === "storeAddresses") {
        // SB-UNI-A (2026-05-13): both user and store addresses live in the
        // single top-level `addresses` collection now, keyed by `id` — the
        // old per-parent subcollection paths (users/{uid}/addresses,
        // stores/{slug}/addresses) no longer exist, so deleting from them was
        // always a silent no-op. Delete by doc id straight from `addresses`.
        for (const d of seed) {
          if (!d.id) { stats.skipped++; continue; }
          const ref = db.collection("addresses").doc(d.id);
          if ((await ref.get()).exists) { await ref.delete(); stats.deleted++; }
          else stats.skipped++;
        }
      } else if (colName === "couponUsage") {
        const userIds = [...new Set(seed.map((d) => d.userId).filter(Boolean))];
        for (const uid of userIds) {
          stats.deleted += await purgeCollection(`${USER_COLLECTION}/${uid}/couponUsage`);
        }
      } else if (colName === "siteSettings") {
        const ref = db.collection(SITE_SETTINGS_COLLECTION).doc("global");
        if ((await ref.get()).exists) { await ref.delete(); stats.deleted++; } else stats.skipped++;
      } else {
        stats.deleted += await purgeCollection(COLLECTION_MAP[colName]);
      }
    } catch (err) {
      console.error(`✗ ${colName}: ${err.message}`);
      stats.errors++;
    }
  }

  console.log(`\n✓ Delete complete — removed ${stats.deleted}, errors ${stats.errors}\n`);
  process.exit(stats.errors > 0 ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Dry run
// ---------------------------------------------------------------------------
async function cmdDryRun(intendedAction) {
  console.log(`\nDry run (${intendedAction}) — no writes will happen.\n`);
  console.log(`${"collection".padEnd(22)} ${"seed".padStart(6)} ${"in db".padStart(6)} ${"would " + (intendedAction === "load" ? "create" : "delete")}`);
  console.log("─".repeat(56));
  let totalCreate = 0, totalDelete = 0;
  for (const c of collectionsToProcess) {
    const seedCount = (SEED_DATA_MAP[c] || []).length;
    const existing = await countExisting(c).catch(() => 0);
    const wouldCreate = intendedAction === "load" ? Math.max(seedCount - existing, 0) : 0;
    const wouldDelete = intendedAction === "delete" ? existing : 0;
    totalCreate += wouldCreate; totalDelete += wouldDelete;
    console.log(`  ${c.padEnd(20)} ${String(seedCount).padStart(6)} ${String(existing).padStart(6)} ${String(intendedAction === "load" ? wouldCreate : wouldDelete).padStart(12)}`);
  }
  console.log("─".repeat(56));
  console.log(`Total would ${intendedAction === "load" ? "create" : "delete"}: ${intendedAction === "load" ? totalCreate : totalDelete}\n`);
}

// ---------------------------------------------------------------------------
// Main
/**
 * `appkit-seed purge` — delete every `seedPurpose: "test"` document and NOTHING
 * else.
 *
 * ## Why this is not `delete`
 *
 * `delete` empties whole COLLECTIONS. That is the right tool for a full reset
 * and the wrong one for "clear the test data": it would take the 85 authored
 * FAQs, the 416-node taxonomy every product's `categorySlugs` chain points
 * into, the real HSN tax codes, the 1,337 tester cases and the AES-encrypted
 * site credentials with it.
 *
 * This is a QUERY over a declaration — `where("seedPurpose","==","test")` —
 * which gives four properties no heuristic can:
 *
 *   1. **A row the seeder never wrote is unreachable.** Organic documents (a
 *      real buyer's cart, a runtime notification, a real signup) carry no
 *      `seedPurpose` at all, so an equality on it cannot match them. Measured
 *      live: 64 of 84 users are organic. That is the single most important
 *      safety property here, and it comes from the field's ABSENCE rather than
 *      from a list someone has to maintain.
 *   2. **The keep-list is data, not code.** `store-letitrip-official` and
 *      `user-admin-letitrip` resolve `permanent`, so the same query skips them.
 *      This replaces `cmdDelete`'s private `PROTECTED_USER_UIDS` set.
 *   3. **No composite index.** A single-field equality is served by Firestore's
 *      automatic index, so this adds nothing to `firestore.indexes.json` — the
 *      gap that left `priceIndex` queryless.
 *   4. **The cascade is mostly automatic.** Orders, bids, reviews, offers,
 *      carts, payouts and notifications are all `test`, so a purged product's
 *      dependents go in the same pass rather than needing a reference walk.
 *
 * 🛑 **Auth is a SECOND delete and `delete`/`purge` are the only places that
 * know it.** A Firestore user row and its Firebase Auth record are two objects;
 * removing the row and leaving the login is the worst of the three outcomes,
 * because the account then looks absent and can still authenticate.
 *
 * 🛑 **What it deliberately does NOT do**: delete organic rows that reference a
 * purged one. An organic notification pointing at a purged test order becomes a
 * dangling reference — and it is a real person's record, so it is REPORTED
 * rather than removed. Guessing in the destructive direction on someone's own
 * data is not a trade this command gets to make.
 */
async function cmdPurge() {
  const targets = collectionsToProcess;

  /* Subcollections are not reachable by a top-level query, so they are walked
   * explicitly. `couponUsage` lives at `users/{uid}/couponUsage`. */
  const SUBCOLLECTIONS = [{ key: "couponUsage", parent: USER_COLLECTION, name: "couponUsage" }];

  const plan = [];
  for (const colName of targets) {
    const path = COLLECTION_MAP[colName];
    if (!path) continue;
    const sub = SUBCOLLECTIONS.find((s) => s.key === colName);
    try {
      if (sub) {
        /* A collection-group query reaches every parent at once. */
        const snap = await db.collectionGroup(sub.name).where("seedPurpose", "==", "test").get();
        if (snap.size > 0) plan.push({ colName, docs: snap.docs, isSub: true });
      } else {
        const snap = await db.collection(path).where("seedPurpose", "==", "test").get();
        if (snap.size > 0) plan.push({ colName, docs: snap.docs, isSub: false });
      }
    } catch (err) {
      console.error(`✗ ${colName}: ${err.message}`);
    }
  }

  const total = plan.reduce((n, p) => n + p.docs.length, 0);
  console.log(`\n${"collection".padEnd(26)} ${"purge".padStart(6)}`);
  console.log("─".repeat(36));
  for (const p of plan) {
    console.log(`  ${p.colName.padEnd(24)} ${String(p.docs.length).padStart(6)}`);
  }
  console.log("─".repeat(36));
  console.log(`  ${"TOTAL".padEnd(24)} ${String(total).padStart(6)}\n`);

  if (total === 0) {
    console.log("Nothing to purge — no document carries seedPurpose \"test\".");
    return;
  }

  if (DRY_RUN) {
    console.log("--dry-run — nothing was deleted.");
    return;
  }

  if (
    !(await confirm(
      `Delete ${total} test document(s) in project '${process.env.FIREBASE_ADMIN_PROJECT_ID}'? Permanent content and organic rows are untouched.`,
    ))
  ) {
    console.log("Aborted.");
    process.exit(0);
  }

  const stats = { deleted: 0, auth: 0, errors: 0 };
  for (const p of plan) {
    /*
     * 🛑 `users` first deletes the AUTH record, then the Firestore row — in that
     * order, because the reverse can leave an authenticating account whose
     * profile is gone, and this loop is the only thing that knows both exist.
     */
    if (p.colName === "users") {
      for (const d of p.docs) {
        try {
          await auth.deleteUser(d.id);
          stats.auth++;
        } catch (e) {
          if (e?.code !== "auth/user-not-found") console.error(`    auth ${d.id}: ${e.message}`);
        }
      }
    }
    for (let i = 0; i < p.docs.length; i += 450) {
      const chunk = p.docs.slice(i, i + 450);
      const batch = db.batch();
      for (const d of chunk) batch.delete(d.ref);
      try {
        await batch.commit();
        stats.deleted += chunk.length;
        if (VERBOSE) for (const d of chunk) console.log(`    - ${p.colName}/${d.id}`);
      } catch (err) {
        console.error(`✗ ${p.colName}: ${err.message}`);
        stats.errors++;
      }
    }
  }

  console.log(
    `\n${stats.errors === 0 ? "✓" : "✗"} Purge complete — deleted ${stats.deleted}, auth records ${stats.auth}, errors ${stats.errors}`,
  );
  if (stats.errors > 0) process.exit(1);
}

// ---------------------------------------------------------------------------
try {
  if (ACTION === "status") await cmdStatus();
  else if (ACTION === "load") await cmdLoad();
  else if (ACTION === "delete") await cmdDelete();
  else if (ACTION === "purge") await cmdPurge();
  process.exit(0);
} catch (err) {
  console.error("✗ Fatal:", err.message);
  if (VERBOSE) console.error(err.stack);
  process.exit(1);
}
