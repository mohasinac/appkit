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
if (!["load", "delete", "status"].includes(ACTION)) {
  console.error("usage:");
  console.error("  appkit-seed <load|delete|status> [flags]");
  console.error("  appkit-seed-add     [flags]   # alias for `appkit-seed load`");
  console.error("  appkit-seed-remove  [flags]   # alias for `appkit-seed delete`");
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
  categoriesSeedData, storesSeedData, sessionsSeedData,
  productsStandardSeedData, productsAuctionsSeedData, productsPreordersSeedData,
  productsPrizeDrawsSeedData, productsClassifiedsSeedData, productsDigitalCodesSeedData, productsLiveItemsSeedData,
  ordersSeedData, reviewsSeedData, cartsSeedData, bidsSeedData,
  couponsSeedData, couponUsageSeedData,
  eventsSeedData, eventEntriesSeedData, payoutsSeedData,
  notificationsSeedData, blogPostsSeedData,
  carouselsSeedData, carouselSlidesSeedData, homepageSectionsSeedData,
  siteSettingsSeedData, faqSeedData,
  wishlistsSeedData, historySeedData, conversationsSeedData,
  groupedListingsSeedData,
  scammersSeedData, productFeaturesSeedData,
  testerChecklistSeedData,
  storesTesterSeedData, categoriesTesterSeedData, productsTesterSeedData,
  blogTesterSeedData, eventsTesterSeedData,
  couponsTesterSeedData, bidsTesterSeedData, ordersTesterSeedData,
  // collection constants
  USER_COLLECTION,
  CATEGORIES_COLLECTION, STORE_COLLECTION,
  PRODUCT_COLLECTION, ORDER_COLLECTION, REVIEW_COLLECTION, BID_COLLECTION,
  COUPONS_COLLECTION, CAROUSELS_COLLECTION, CAROUSEL_SLIDES_COLLECTION,
  HOMEPAGE_SECTIONS_COLLECTION, SITE_SETTINGS_COLLECTION, FAQS_COLLECTION,
  NOTIFICATIONS_COLLECTION, PAYOUT_COLLECTION, BLOG_POSTS_COLLECTION,
  EVENTS_COLLECTION, EVENT_ENTRIES_COLLECTION, SESSION_COLLECTION,
  CART_COLLECTION, CONVERSATIONS_COLLECTION,
  GROUPED_LISTINGS_COLLECTION, SCAMMER_COLLECTION,
  WISHLIST_COLLECTION, HISTORY_COLLECTION, PRODUCT_FEATURES_COLLECTION,
  TESTER_CHECKLIST_ITEM_COLLECTION,
  // PII field/index constants (plain data, still in the main barrel — the
  // crypto functions themselves come from appkitServer above)
  USER_PII_FIELDS, USER_PII_INDEX_MAP,
  ADDRESS_PII_FIELDS, ORDER_PII_FIELDS, BID_PII_FIELDS, PAYOUT_PII_FIELDS,
  REVIEW_PII_FIELDS, OFFER_PII_FIELDS, EVENT_ENTRY_PII_FIELDS,
  // misc
  generateFAQId,
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
  blogPosts: BLOG_POSTS_COLLECTION,
  events: EVENTS_COLLECTION,
  eventEntries: EVENT_ENTRIES_COLLECTION,
  sessions: SESSION_COLLECTION,
  carts: CART_COLLECTION,
  wishlists: WISHLIST_COLLECTION,
  history: HISTORY_COLLECTION,
  conversations: CONVERSATIONS_COLLECTION,
  groupedListings: GROUPED_LISTINGS_COLLECTION,
  scammerProfiles: SCAMMER_COLLECTION,
  productFeatures: PRODUCT_FEATURES_COLLECTION,
  testerChecklistItems: TESTER_CHECKLIST_ITEM_COLLECTION,
};

const SEED_DATA_MAP = {
  users: usersSeedData,
  addresses: addressesSeedData,
  storeAddresses: storeAddressesSeedData,
  // SB-UNI-C: brands were merged into categories (categoryType:"brand") — no
  // standalone brands collection/seed exists anymore.
  categories: [...(categoriesSeedData || []), ...(categoriesTesterSeedData || [])],
  stores: [...(storesSeedData || []), ...(storesTesterSeedData || [])],
  products: [
    ...(productsStandardSeedData || []), ...(productsAuctionsSeedData || []), ...(productsPreordersSeedData || []),
    ...(productsPrizeDrawsSeedData || []), ...(productsClassifiedsSeedData || []), ...(productsDigitalCodesSeedData || []), ...(productsLiveItemsSeedData || []),
    ...(productsTesterSeedData || []),
  ],
  orders: [...(ordersSeedData || []), ...(ordersTesterSeedData || [])],
  reviews: reviewsSeedData,
  bids: [...(bidsSeedData || []), ...(bidsTesterSeedData || [])],
  coupons: [...(couponsSeedData || []), ...(couponsTesterSeedData || [])],
  couponUsage: couponUsageSeedData,
  carousels: carouselsSeedData,
  carouselSlides: carouselSlidesSeedData,
  homepageSections: homepageSectionsSeedData,
  siteSettings: [siteSettingsSeedData],
  faqs: faqSeedData,
  notifications: notificationsSeedData,
  payouts: payoutsSeedData,
  blogPosts: [...(blogPostsSeedData || []), ...(blogTesterSeedData || [])],
  events: [...(eventsSeedData || []), ...(eventsTesterSeedData || [])],
  eventEntries: eventEntriesSeedData,
  sessions: sessionsSeedData,
  carts: cartsSeedData,
  wishlists: wishlistsSeedData,
  history: historySeedData,
  conversations: conversationsSeedData,
  groupedListings: groupedListingsSeedData,
  scammerProfiles: scammersSeedData,
  productFeatures: productFeaturesSeedData,
  testerChecklistItems: testerChecklistSeedData,
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
      const plain = stripUndefined({ ...u });
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
      const payload = piiFields ? encryptPiiFields(stripUndefined(data), [...piiFields]) : stripUndefined(data);
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
      await db.collection(coll).doc(id).set(
        stripUndefined({ userId, items: items ?? [], updatedAt: updatedAt ?? new Date() }),
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
      data: encryptSeedPii(colName, stripUndefined(data)),
    });
  }
  const BATCH = 500;
  for (let i = 0; i < items.length; i += BATCH) {
    const chunk = items.slice(i, i + BATCH);
    const batch = db.batch();
    for (const { ref, data } of chunk) batch.set(ref, data, { merge: true });
    await batch.commit();
    stats.created += chunk.length;
  }
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
            const payload = encryptPiiFields(stripUndefined({ ownerType, ownerId, ...data }), [...ADDRESS_PII_FIELDS]);
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
            const payload = encryptPiiFields(
              stripUndefined({ ownerType: "store", ownerId: storeSlug, ...data }),
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
              .set(stripUndefined({ couponId, ...data }), { merge: true });
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
          await db.collection(SITE_SETTINGS_COLLECTION).doc("global").set(stripUndefined(settings), { merge: true });
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
// ---------------------------------------------------------------------------
try {
  if (ACTION === "status") await cmdStatus();
  else if (ACTION === "load") await cmdLoad();
  else if (ACTION === "delete") await cmdDelete();
  process.exit(0);
} catch (err) {
  console.error("✗ Fatal:", err.message);
  if (VERBOSE) console.error(err.stack);
  process.exit(1);
}
