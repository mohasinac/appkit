#!/usr/bin/env node
/**
 * backfill-product-store-names — fill in `storeName` / `storeSlug` on products
 * that were created before those fields were denormalized.
 *
 * Why this exists: a listing card renders "by <seller>" straight off the product
 * document, because the public browse query (`listPublicProducts`) never touches
 * `storeRepository`. `ProductDocument.storeName` was optional and no seller-facing
 * create path ever set it — only seed data and the admin route did — so every real
 * seller listing rendered a card with no seller on it, while a seeded environment
 * looked entirely correct.
 *
 * The create paths now populate both fields, and `storeNameBackfill` (a JOB_RUNNERS
 * entry, enqueued on rename) keeps them current. This script is the one-time
 * catch-up for documents that predate all of that, and a manual repair tool if a
 * rename job is ever lost.
 *
 * Talks directly to Firestore via firebase-admin — no dev server, no deploy.
 *
 * Usage (from consumer project root, e.g. d:/proj/letitrip.in):
 *   node appkit/scripts/backfill-product-store-names.mjs --dry-run
 *   node appkit/scripts/backfill-product-store-names.mjs --yes
 *   node appkit/scripts/backfill-product-store-names.mjs --yes --store store-beyblade-arena
 *   node appkit/scripts/backfill-product-store-names.mjs --yes --service-account <key.json>
 *
 * Idempotent: a product already carrying both correct values is skipped, so a
 * second run writes nothing.
 *
 * Exit: 0 = success, 1 = errors during run, 2 = misconfiguration.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const rawArgs = process.argv.slice(2);
function flag(name, fallback = undefined) {
  const i = rawArgs.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = rawArgs[i + 1];
  return v && !v.startsWith("--") ? v : true;
}
const SERVICE_ACCOUNT_OVERRIDE = typeof flag("service-account") === "string" ? flag("service-account") : null;
const DRY_RUN = flag("dry-run", false) === true;
const CONFIRMED = flag("yes", false) === true;
const ONLY_STORE = typeof flag("store") === "string" ? flag("store") : null;

if (!DRY_RUN && !CONFIRMED) {
  console.error("✗ Refusing to write without --yes. Re-run with --dry-run to preview, or --yes to apply.");
  process.exit(2);
}

// ---------------------------------------------------------------------------
// .env.local loader (same shape as seed-cli.mjs / purge-tester-sandbox.mjs)
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
} else {
  console.warn(`⚠ .env.local not found at ${envLocalPath} — relying on existing process.env`);
}

const required = ["FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY"];
const missing = required.filter((k) => !process.env[k]);
if (!SERVICE_ACCOUNT_OVERRIDE && missing.length > 0) {
  console.error(`✗ Missing required env vars: ${missing.join(", ")}`);
  console.error("  Either set them in .env.local or pass --service-account <path-to-key.json>");
  process.exit(2);
}

// ---------------------------------------------------------------------------
// firebase-admin init
// ---------------------------------------------------------------------------
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

function parsePrivateKey(raw) {
  if (!raw) return raw;
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

if (!admin.apps.length) {
  if (SERVICE_ACCOUNT_OVERRIDE) {
    const key = JSON.parse(readFileSync(resolve(repoRoot, SERVICE_ACCOUNT_OVERRIDE), "utf8"));
    admin.initializeApp({ credential: admin.credential.cert(key) });
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID.trim(),
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL.trim(),
        privateKey: parsePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
      }),
    });
  }
}
const db = admin.firestore();
console.log(`✓ Connected to project: ${process.env.FIREBASE_ADMIN_PROJECT_ID || "(service-account)"}`);
if (DRY_RUN) console.log("• DRY RUN — no writes will be made\n");

const BATCH_LIMIT = 500; // Firestore write-batch hard ceiling

// ---------------------------------------------------------------------------
// Read every product, group by storeId, resolve each store ONCE
// ---------------------------------------------------------------------------
let productsQuery = db.collection("products");
if (ONLY_STORE) productsQuery = productsQuery.where("storeId", "==", ONLY_STORE);

const productSnap = await productsQuery.get();
console.log(`• ${productSnap.size} product${productSnap.size === 1 ? "" : "s"} scanned${ONLY_STORE ? ` (store: ${ONLY_STORE})` : ""}`);

// Grouping is what keeps this cheap: one store read per DISTINCT store, not one
// per product. There are a handful of stores and many products.
const storeIds = new Set();
const orphans = [];
for (const doc of productSnap.docs) {
  const storeId = doc.get("storeId");
  if (typeof storeId === "string" && storeId) storeIds.add(storeId);
  else orphans.push(doc.id);
}

const stores = new Map();
for (const storeId of storeIds) {
  const storeDoc = await db.collection("stores").doc(storeId).get();
  if (storeDoc.exists) {
    stores.set(storeId, {
      storeName: storeDoc.get("storeName") ?? storeId,
      storeSlug: storeDoc.get("storeSlug") ?? storeId,
    });
  } else {
    stores.set(storeId, null);
  }
}
console.log(`• ${storeIds.size} distinct store${storeIds.size === 1 ? "" : "s"} resolved`);

// ---------------------------------------------------------------------------
// Diff, then write
// ---------------------------------------------------------------------------
const updates = [];
let alreadyCorrect = 0;
const missingStores = new Map();

for (const doc of productSnap.docs) {
  const storeId = doc.get("storeId");
  if (typeof storeId !== "string" || !storeId) continue;

  const store = stores.get(storeId);
  if (!store) {
    // A product pointing at a store that does not exist. Reported, never
    // guessed at — writing the dangling id as a display name would put a slug
    // on the card and call it a seller.
    missingStores.set(storeId, (missingStores.get(storeId) ?? 0) + 1);
    continue;
  }

  if (doc.get("storeName") === store.storeName && doc.get("storeSlug") === store.storeSlug) {
    alreadyCorrect += 1;
    continue;
  }
  updates.push({ ref: doc.ref, id: doc.id, ...store });
}

console.log(`\n  already correct : ${alreadyCorrect}`);
console.log(`  to update       : ${updates.length}`);
if (orphans.length > 0) {
  console.log(`  ⚠ no storeId    : ${orphans.length} — ${orphans.slice(0, 5).join(", ")}${orphans.length > 5 ? ", …" : ""}`);
  console.log("    These predate the create-path fix and are invisible on their own storefront.");
  console.log("    They need a store assigned by hand; this script will not guess one.");
}
for (const [storeId, count] of missingStores) {
  console.log(`  ⚠ store missing : ${storeId} (${count} product${count === 1 ? "" : "s"})`);
}

if (updates.length === 0) {
  console.log("\n✓ Nothing to do.");
  process.exit(0);
}

if (DRY_RUN) {
  for (const u of updates.slice(0, 20)) {
    console.log(`    ${u.id} → storeName="${u.storeName}" storeSlug="${u.storeSlug}"`);
  }
  if (updates.length > 20) console.log(`    … and ${updates.length - 20} more`);
  console.log("\n✓ Dry run complete — re-run with --yes to apply.");
  process.exit(0);
}

let written = 0;
let failed = 0;
for (let i = 0; i < updates.length; i += BATCH_LIMIT) {
  const slice = updates.slice(i, i + BATCH_LIMIT);
  const batch = db.batch();
  for (const u of slice) {
    batch.update(u.ref, { storeName: u.storeName, storeSlug: u.storeSlug, updatedAt: new Date() });
  }
  try {
    await batch.commit();
    written += slice.length;
  } catch (err) {
    // Per chunk, so one bad batch does not discard the ones already committed.
    // The script is idempotent, so a re-run picks up exactly what is left.
    failed += slice.length;
    console.error(`✗ Batch starting at ${i} failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log(`\n✓ Updated ${written} product${written === 1 ? "" : "s"}${failed > 0 ? `, ${failed} failed` : ""}`);
process.exit(failed > 0 ? 1 : 0);
