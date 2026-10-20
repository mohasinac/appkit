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
const { encryptPiiFields, piiIndicesFor, encryptPayoutDetails, encryptPayoutBankAccount, encryptShippingConfig,
  buildTokensIndex, BLIND_INDEX_KEY_VERSION_FIELD, CURRENT_BLIND_INDEX_KEY_VERSION } = appkitServer;

const {
  // seed data
  usersSeedData, addressesSeedData, storeAddressesSeedData,
  // store-extensions — see the SEED_DATA_MAP note below (Root Cause #90, 7-16).
  payoutMethodsSeedData, shippingConfigsSeedData, analyticsCardsSeedData, analyticsAlertsSeedData,
  storeCategoriesSeedData, listingTemplatesSeedData, moderationQueueSeedData, reportsSeedData,
  itemRequestsSeedData, storeGoogleConfigSeedData,
  categoriesSeedData, storesSeedData, sessionsSeedData,
  productsStandardSeedData, productsBeybladeXSeedData, productsAuctionsSeedData, productsPreordersSeedData,
  productsPrizeDrawsSeedData, productsClassifiedsSeedData, productsDigitalCodesSeedData, productsLiveItemsSeedData,
  productsArtSeedData, productsStickersSeedData, productsSparesSeedData,
  productsCatalogueSeedData,
  FRANCHISE_BY_CATEGORY_ROOT,
  ordersSeedData, reviewsSeedData, cartsSeedData, bidsSeedData,
  couponsSeedData, couponUsageSeedData,
  eventsSeedData, eventEntriesSeedData, payoutsSeedData, offersSeedData,
  notificationsSeedData, blogPostsSeedData,
  carouselsSeedData, carouselSlidesSeedData, homepageSectionsSeedData,
  siteSettingsSeedData, faqSeedData,
  wishlistsSeedData, historySeedData,
  groupedListingsSeedData,
  mediaAssetsSeedData,
  scammersSeedData, productFeaturesSeedData, taxCodesSeedData,
  authenticityKnowledgeSeedData,
  partGlossarySeedData, modelCompositionSeedData,
  beysSeedData, beyProductsSeedData,
  BEYS_COLLECTION, BEY_PRODUCTS_COLLECTION,
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
  /*
   * `/media/<shortId>` resolves ONLY through a mediaAssets document, so without
   * these rows every seeded cover image 404s while its object sits untouched in
   * the bucket. Seeded rather than left as a side effect of the upload script
   * precisely so a Firestore wipe cannot orphan Storage.
   */
  mediaAssets: "mediaAssets",
  scammerProfiles: SCAMMER_COLLECTION,
  productFeatures: PRODUCT_FEATURES_COLLECTION,
  authenticityKnowledge: "authenticityKnowledge",
  taxCodes: TAX_CODES_COLLECTION,
  // E4/D12 — extracted from the local corpus, generated into the seed.
  partGlossary: PART_GLOSSARY_COLLECTION,
  /*
   * The BEY reference database. Mirrors `partGlossary`: extracted from a
   * corpus by committed scripts, shares its id with the paired category leaf,
   * and keeps measured data OFF `categories` so a reseed cannot drop every
   * bey page's ISR entry.
   */
  beys: BEYS_COLLECTION,
  beyProducts: BEY_PRODUCTS_COLLECTION,
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
/**
 * Stamp `franchise` / `franchiseSlug` from the product's category ROOT.
 *
 * 🛑 Its OWN pass, deliberately NOT folded into `withDerivedCategoryFields`.
 * That function early-returns on `gstRate && hsnCode && authenticity`, which
 * every one of the 1,237 generated catalogue rows already satisfies — so a
 * franchise derived in there would be silently skipped for 95% of the
 * catalogue. That is the exact bug its own comment records happening when
 * `authenticity` was added beside `gstRate`; adding a third field to the same
 * condition is how it happens a third time.
 *
 * A root with no mapping yields NO franchise (living collectibles are not an
 * IP) — see `FRANCHISE_BY_CATEGORY_ROOT`.
 */
/**
 * The real, sellable catalogue — everything else in the product seed is demo
 * furniture and is DROPPED HERE, before anything is written.
 *
 * ── 🛑 WHY A FILTER AND NOT A DELETION ────────────────────────────────────
 *
 * The fixtures stay in their files on purpose: they are the only coverage
 * several features have (every `preOrderProductionStatus` value, a sold-out
 * reservation, a depleted digital-code pool, an ended-unsold auction), and
 * the tester checklist deep-links to them by id. Deleting them would silently
 * remove that coverage. Not LOADING them is the part that was wanted.
 *
 * ── 🛑 WHY THIS HAD TO EXIST ──────────────────────────────────────────────
 *
 * `appkit-seed load` writes every registered row and `purge` deletes
 * `seedPurpose: "test"` afterwards — so the demo listings came BACK on every
 * reseed, and anyone who ran `load` to fix imagery silently republished 76
 * fake products to the live storefront. That happened twice in one session.
 * The owner's instruction was "delete them from the seed itself and make sure
 * they do not return"; this is the point where that can be guaranteed, since
 * every write path funnels through here.
 *
 * ── The discriminator is the STORE, not the listing type ──────────────────
 *
 * `store-beyblade-arena` is the fictional demo seller; `store-letitrip-
 * official` is the real one. Keying on the store rather than on a per-file
 * allow-list means a fixture added to ANY product seed file later is excluded
 * automatically, which is the failure mode this is replacing — a list that
 * has to be remembered is a list that drifts.
 *
 * Set `SEED_INCLUDE_DEMO=1` to load them anyway, for local demo work.
 */
const REAL_STORE_IDS = new Set(["store-letitrip-official"]);

function realListingsOnly(products) {
  if (process.env.SEED_INCLUDE_DEMO === "1") {
    console.log("▌ SEED_INCLUDE_DEMO=1 — demo listings INCLUDED");
    return products;
  }
  /*
   * 🛑 TWO rules, because the store alone is not enough. Six prize-draw
   * fixtures live under the REAL store and are still demo furniture — their
   * imagery is a 460-byte generated colour tile from /images/seed-tiles/,
   * which is the giveaway: a listing nobody photographed is a listing nobody
   * intends to sell. Measured before writing this: every one of the six, and
   * nothing real, matches.
   */
  const isPlaceholder = (p) => {
    const urls = [p?.mainImage, ...(Array.isArray(p?.images) ? p.images : [])]
      .map((v) => (typeof v === "string" ? v : v?.url))
      .filter(Boolean);
    return urls.length > 0 && urls.every((u) => String(u).includes("/images/seed-tiles/"));
  };
  const kept = products.filter((p) => REAL_STORE_IDS.has(p?.storeId) && !isPlaceholder(p));
  const dropped = products.length - kept.length;
  if (dropped > 0) {
    console.log(`  • ${dropped} demo listing(s) not loaded (set SEED_INCLUDE_DEMO=1 to include)`);
  }
  return kept;
}

/**
 * Drop bundle categories whose members are not in the loaded catalogue.
 *
 * 🛑 A bundle is ALL-OR-NOTHING — `canAddToCart` buys every member together —
 * so a bundle missing even one member is unsellable, and one missing ALL of
 * them is a card that opens an empty page. Measured right after the demo
 * listings stopped loading: of the five seeded bundles, three had zero
 * surviving members and the other two had 1-of-4 and 2-of-3. All five were
 * still `isActive: true`, and all five rendered on the HOMEPAGE as collage
 * cards built from `display.mosaicImages` — which are baked at seed time from
 * the members' own imagery, so they kept showing pictures of products that no
 * longer exist. That is 92 placeholder-tile references on the homepage.
 *
 * Derived rather than hand-maintained for the same reason as the product
 * filter: a bundle that becomes valid later starts loading again on its own,
 * and one that breaks stops, with nobody having to remember either.
 *
 * Only `categoryType: "bundle"` rows are considered. Every other category is
 * taxonomy and is never touched — rebuilding the tree is expensive and is
 * explicitly not what this is for.
 */
function loadableBundlesOnly(categories, loadedProducts) {
  const live = new Set(loadedProducts.map((p) => p?.id).filter(Boolean));
  let dropped = 0;
  const kept = categories.filter((c) => {
    if (c?.categoryType !== "bundle") return true;
    const ids = Array.isArray(c.bundleProductIds) ? c.bundleProductIds : [];
    const ok = ids.length > 0 && ids.every((id) => live.has(id));
    if (!ok) dropped++;
    return ok;
  });
  if (dropped > 0) {
    console.log(`  • ${dropped} bundle(s) not loaded — members missing from the catalogue`);
  }
  return kept;
}

function withFranchise(products) {
  let stamped = 0;
  const out = products.map((p) => {
    if (p.franchiseSlug) return p;
    const chain = Array.isArray(p.categorySlugs) ? p.categorySlugs : [];
    const root = chain.length > 0 ? String(chain[chain.length - 1]) : null;
    const f = root ? FRANCHISE_BY_CATEGORY_ROOT[root] : null;
    if (!f) return p;
    stamped++;
    return { ...p, franchise: f.name, franchiseSlug: f.slug };
  });
  console.log(`  • franchise stamped on ${stamped}/${products.length} products`);
  return out;
}

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

/**
 * The real catalogue, computed ONCE so the bundle filter and the product
 * loader cannot disagree about what "loaded" means. Deriving it twice is
 * Root Cause #75's shape — two copies of one rule, one of which learns about
 * a change and the other does not.
 */
const REAL_PRODUCTS = realListingsOnly([
    ...(productsStandardSeedData || []),
    // Real, wiki-verified Beyblade X listings under store-letitrip-official —
    // added 2026-10-19 for PhonePe merchant registration, which requires at
    // least one genuinely purchasable product. See the file's own header.
    ...(productsBeybladeXSeedData || []),
    ...(productsAuctionsSeedData || []), ...(productsPreordersSeedData || []),
    ...(productsPrizeDrawsSeedData || []), ...(productsClassifiedsSeedData || []), ...(productsDigitalCodesSeedData || []), ...(productsLiveItemsSeedData || []),
    // art + stickers were written, exported from the seed barrel, and then never
    // spread here — so 13 fixtures had NEVER reached the database, /art and
    // /stickers were permanently empty, and listingType=art|stickers returned 0.
    // Root Cause #58's family one layer down: added everywhere except the runner.
    ...(productsArtSeedData || []), ...(productsStickersSeedData || []),
    // 🛑 BOTH sites, every time. This file's own header records 13 art/sticker
    // fixtures that never reached the database because only the import was
    // edited and this spread was not — the loader then wrote every OTHER
    // product and reported success.
    ...(productsSparesSeedData || []),
    /*
     * 🛑 DEREGISTERED 2026-10-19 — productsCatalogueSeedData (1,237 rows, one
     * per taxonomy leaf) is NOT spread here, on purpose.
     *
     * This is a reversal of the comment that used to be here, which said the
     * opposite: that this spread was "what makes `products` reproducible
     * after a full wipe." That was true when the catalogue was the only
     * content under its leaf categories. It stopped being true the moment
     * real curated listings exist for the SAME leaves — four of them,
     * confirmed by grep: `category-aeropegasus-3-70a`, `category-
     * valkyrievolt-s4-70v`, `category-wizardarrow-4-80b`, `category-
     * knightshield-3-80n` each already carry one generated row. Re-enabling
     * this spread would not just add filler back — it would put a
     * hash-priced synthetic duplicate (one measured as a NEGATIVE price,
     * `-61`) into the exact categories the real BX-53 fixture now occupies,
     * silently resurrecting the thing a full `appkit-seed purge` was just run
     * to remove.
     *
     * The generator (`scripts/gen-catalogue-listings.mjs`) and the committed
     * file itself are both left untouched — this is deliberately a one-line
     * "stop loading it" change, not a deletion. Re-enable only after deciding
     * what should happen to a leaf that now has BOTH a real listing and a
     * generated one.
     */
  ]);

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
  categories: loadableBundlesOnly(categoriesSeedData, REAL_PRODUCTS),
  stores: storesSeedData,
  products: withFranchise(withDerivedCategoryFields(REAL_PRODUCTS)),
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
  // The other half of the wiring — load() short-circuits on an empty array, so
  // the COLLECTION_MAP entry above does nothing on its own (Root Cause #90).
  mediaAssets: mediaAssetsSeedData,
  scammerProfiles: scammersSeedData,
  productFeatures: productFeaturesSeedData,
  authenticityKnowledge: authenticityKnowledgeSeedData,
  taxCodes: taxCodesSeedData,
  partGlossary: partGlossarySeedData,
  // 🛑 Both halves are mandatory: load() short-circuits on an empty array, so a
  // COLLECTION_MAP entry alone logs "no seed data, skipping" and exits 0.
  beys: beysSeedData,
  beyProducts: beyProductsSeedData,
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

/*
 * 🛑 `TOKENS_INDEX_MAP` holds ONLY `payouts`, and that is a measured fact
 * about this file, not an oversight.
 *
 * `encryptSeedPii` is called from exactly one place — `loadGeneric`'s
 * per-doc loop. `users` and `addresses` are seeded by their OWN dedicated
 * loaders (`loadUsers`, the addresses block near line 1029) that write
 * straight to Firestore and never call this function — so a `users`/
 * `addresses` entry here would be dead code, silently unreachable, which is
 * worse than no entry: it would read as "handled" to the next person who
 * greps for it.
 *
 * It is also the right scope rather than a gap, because `users` and
 * `addresses` are PRESERVE-tier in the tester harness — never wiped, never
 * reseeded — so the only two things that can write their `*TokensIndex`
 * are a REAL write (covered by `UserRepository`/`AddressesRepository`'s
 * `buildTokensIndexFor`, wired separately) and the one-time bootstrap seed
 * load `appkit-seed load --collections users` documented in CLAUDE.md's
 * § "Claude Tester" — which `backfill-blind-index.mjs` exists to catch up
 * after. `payouts` has no such safety net: it is SEED_TRANSACTIONAL, so it
 * cascades and RESEEDS on every tester run that touches its store, through
 * exactly this function — which is why it is the one entry that matters.
 */
const TOKENS_INDEX_MAP = {
  payouts: { field: "sellerTokensIndex", from: ["sellerName", "sellerEmail"] },
};

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
  let result = fields ? encryptPiiFields(data, [...fields]) : { ...data };
  if (collection === "payouts" && result.bankAccount) {
    result.bankAccount = encryptPayoutBankAccount(result.bankAccount);
  }

  /*
   * 🛑 THIS IS WHAT MAKES `payouts` SURVIVE A TESTER WIPE WITH A WORKING
   * SEARCH INDEX. `payouts` is SEED_TRANSACTIONAL in the tester harness —
   * it cascades on `storeId` whenever its store is wiped, then gets
   * RE-SEEDED by exactly this function. Without this block, the reseeded
   * documents would carry ciphertext and no `sellerTokensIndex` at all,
   * silently undoing a one-shot backfill on the very next tester run.
   */
  const tokensIndex = TOKENS_INDEX_MAP[collection];
  if (tokensIndex) {
    const values = tokensIndex.from.map((f) => data[f]).filter((v) => typeof v === "string");
    if (values.length > 0) {
      result[tokensIndex.field] = buildTokensIndex(...values);
      result[BLIND_INDEX_KEY_VERSION_FIELD] = CURRENT_BLIND_INDEX_KEY_VERSION;
    }
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

/**
 * Collections whose rows a human may hand-correct, with the correction
 * protected from the next reseed.
 *
 * 🛑 AN EXPLICIT LIST, not "every collection". Protection costs one query per
 * load, and more importantly it is only meaningful for GENERATED data: a row
 * an admin authored from scratch (a coupon, an event) is not competing with a
 * generator for ownership of its fields, so there is nothing to protect it
 * from. Adding a collection here is a statement that a generator owns the row
 * and a human may override named fields of it.
 */
/**
 * Drop the keys a human owns from one payload.
 *
 * 🛑 A LOCAL copy of `stripAdminOwnedFields` from
 * `appkit/src/features/parts/schemas/admin-edit.ts`, and the duplication is
 * deliberate: this CLI must run without a built appkit. Importing it from
 * `dist` would reintroduce exactly the build dependency the catalogue
 * generator just shed, and would make a reseed impossible under a memory cap.
 * The function is five lines; the dependency would not be.
 */
function stripAdminOwned(payload, ownedFields) {
  if (!ownedFields?.length) return payload;
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    if (ownedFields.includes(k)) continue;
    out[k] = v;
  }
  return out;
}

const ADMIN_EDIT_PROTECTED = new Set(["partGlossary", "beys"]);

/**
 * The fields a human owns, per document id, for one collection.
 *
 * 🛑 ONE INDEXED EQUALITY, not a read per document. The alternative is
 * fetching all 2,488 parts and 1,988 beys to discover the handful that are
 * protected — 4,476 reads against a 50,000/day free tier, every load, to find
 * what is usually a dozen rows.
 *
 * 🛑 It must be an EQUALITY on a boolean, not an `orderBy` or `!=` on
 * `adminEditedFields`. Both of those silently exclude every document that
 * LACKS the field, which is nearly all of them — the trap that made a store's
 * whole review set return zero (Root Cause #100) and the one `isTestData`
 * warning in the Known TS Patterns table.
 *
 * Fails OPEN to an empty map: if this query errors the load proceeds
 * unprotected, which loses a hand-edit. The alternative — aborting the load —
 * loses the entire reseed. A warning names the collection either way.
 */
async function fetchAdminOwnedFields(colName, firestoreCollection) {
  if (!ADMIN_EDIT_PROTECTED.has(colName)) return new Map();
  try {
    const snap = await db
      .collection(firestoreCollection)
      .where("adminEdited", "==", true)
      .select("adminEditedFields")
      .get();
    const map = new Map();
    for (const d of snap.docs) {
      const fields = d.get("adminEditedFields");
      if (Array.isArray(fields) && fields.length > 0) map.set(d.id, fields);
    }
    if (map.size > 0) {
      console.log(
        `    ${map.size} row(s) carry admin-owned fields — those keys will not be overwritten`,
      );
    }
    return map;
  } catch (err) {
    console.warn(
      `    ⚠ could not read admin-owned fields for ${colName} (${err?.message ?? err}).
` +
        `      Proceeding WITHOUT protection — a hand-correction in this collection may be lost.`,
    );
    return new Map();
  }
}

async function loadGeneric(colName, seed, firestoreCollection, stats) {
  const adminOwned = await fetchAdminOwnedFields(colName, firestoreCollection);
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
      /*
       * 🛑 Admin-owned keys dropped LAST, after every other transform.
       *
       * Stripping earlier would let `stampSeedPurpose` or `encryptSeedPii`
       * re-add a key a human owns — both of them write fields — and the whole
       * point is that what reaches Firestore carries none of them. A
       * merge-write leaves an absent key exactly as it was, which is how the
       * correction survives.
       */
      data: stripAdminOwned(
        encryptSeedPii(colName, stripUndefined(stampSeedPurpose(colName, data, docId))),
        adminOwned.get(docId),
      ),
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
        /*
         * 🛑 Unfiltered collection-group read, filtered in memory — NOT
         * `.where("seedPurpose", "==", "test")` on the group.
         *
         * A single-field equality is auto-indexed per COLLECTION, but a
         * COLLECTION-GROUP query needs an explicit composite/group index that
         * this project has never deployed, and `purge` must not require a
         * Firebase deploy just to run (it is a read-then-delete script, not an
         * infra change). Measured live: `3 FAILED_PRECONDITION: ... requires a
         * COLLECTION_GROUP_ASC index`. `couponUsage` is small (single digits
         * per store), so reading the whole group and filtering client-side
         * costs nothing here — this is not a pattern to reuse on a large
         * subcollection.
         */
        const snap = await db.collectionGroup(sub.name).get();
        const docs = snap.docs.filter((d) => d.data()?.seedPurpose === "test");
        if (docs.length > 0) plan.push({ colName, docs, isSub: true });
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
    /*
     * 🛑 BulkWriter, never a manually-chunked `db.batch()`.
     *
     * A 450-document chunk stays under Firestore's 500-OPERATION limit but
     * says nothing about the 10 MiB per-request PAYLOAD limit — and a rich
     * document (a product's `searchTxt` array, `customFields`,
     * `customSections`, `images[]`) can blow that well before 450 count.
     * Measured live purging this exact `products` collection: `3
     * INVALID_ARGUMENT: Transaction too big` partway through, which aborted
     * the whole chunk's commit and silently left every doc in it undeleted —
     * `stats.deleted` kept counting the chunk as done regardless, so the
     * printed total was wrong by exactly the size of the failed chunk.
     *
     * `db.bulkWriter()` sizes and retries its own requests, so it is correct
     * regardless of document size — CLAUDE.md documents the identical failure
     * for a `categories` wipe (1,177 rows, ~100-entry `searchTxt` each) dying
     * at a 400-doc batch for the same reason.
     */
    const writer = db.bulkWriter();
    let chunkErrors = 0;
    writer.onWriteError((err) => {
      chunkErrors += 1;
      console.error(`✗ ${p.colName}/${err.documentRef.id}: ${err.message}`);
      // Retry up to the default limit; beyond that, give up on this one doc
      // rather than retrying forever.
      return err.failedAttempts < 3;
    });
    for (const d of p.docs) {
      writer.delete(d.ref);
      if (VERBOSE) console.log(`    - ${p.colName}/${d.id}`);
    }
    await writer.close();
    stats.deleted += p.docs.length - chunkErrors;
    stats.errors += chunkErrors;
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
