#!/usr/bin/env node
/**
 * backfill-category-metrics — one-off recompute of categories.metrics.{productCount,
 * auctionCount,totalItemCount,...} against the real products collection.
 *
 * Talks directly to Firestore via firebase-admin — does not require the Next.js dev
 * server or a deployed Cloud Function. Mirrors reconcileCategories() in
 * appkit/src/_internal/server/jobs/core/countersReconcile.ts (the scheduled
 * `countersReconcile` Function, daily 03:00 UTC) — same effective-category
 * selection (categorySlugs[0], falling back to the deprecated `category` field)
 * and the same leaf + ancestor rollup shape written by categoriesRepository.setMetrics().
 * Keep them in sync.
 *
 * Why this script exists: the nightly Function only updates a category the moment a
 * product transitions into/out of "published" — it does nothing for products that were
 * already published before the Function was ever deployed (e.g. seeded data), and the
 * reconcile job itself had a bug (fixed alongside this script) reading the wrong field.
 * This script performs the one-time catch-up recompute without requiring a Functions
 * deploy.
 *
 * Usage (from consumer project root, e.g. d:/proj/letitrip.in):
 *   node appkit/scripts/backfill-category-metrics.mjs
 *   node appkit/scripts/backfill-category-metrics.mjs --service-account <path-to-key.json>
 *   node appkit/scripts/backfill-category-metrics.mjs --dry-run
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
const DRY_RUN = Boolean(flag("dry-run"));

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
console.log(`✓ Connected to project: ${process.env.FIREBASE_ADMIN_PROJECT_ID || "(service-account)"}${DRY_RUN ? " (dry run)" : ""}`);

// ---------------------------------------------------------------------------
// Recompute — mirrors reconcileCategories() in countersReconcile.ts
// ---------------------------------------------------------------------------
const productsSnap = await db.collection("products").where("status", "==", "published").limit(5000).get();
console.log(`✓ ${productsSnap.size} published products found`);

/** @type {Record<string, { productIds: string[]; auctionIds: string[] }>} */
const leafCounts = {};
for (const doc of productsSnap.docs) {
  const data = doc.data();
  const categorySlugs = Array.isArray(data.categorySlugs) ? data.categorySlugs : [];
  const catId = categorySlugs.length > 0 ? categorySlugs[0] : data.category;
  if (!catId) continue;
  if (!leafCounts[catId]) leafCounts[catId] = { productIds: [], auctionIds: [] };
  if (data.listingType === "auction") leafCounts[catId].auctionIds.push(doc.id);
  else leafCounts[catId].productIds.push(doc.id);
}

const leafEntries = Object.entries(leafCounts);
console.log(`✓ ${leafEntries.length} leaf categories with published products`);

async function setMetrics(categoryId, productCount, auctionCount, productIds, auctionIds) {
  if (DRY_RUN) {
    console.log(`  [dry-run] ${categoryId}: products=${productCount} auctions=${auctionCount}`);
    return;
  }
  await db
    .collection("categories")
    .doc(categoryId)
    .update({
      "metrics.productCount": productCount,
      "metrics.auctionCount": auctionCount,
      "metrics.totalProductCount": productCount,
      "metrics.totalAuctionCount": auctionCount,
      "metrics.totalItemCount": productCount + auctionCount,
      "metrics.productIds": productIds,
      "metrics.auctionIds": auctionIds,
      "metrics.lastUpdated": new Date(),
      updatedAt: new Date(),
    });
}

const ancestorAggregates = {};
let leafUpdated = 0;
let leafErrors = 0;
for (const [catId, { productIds, auctionIds }] of leafEntries) {
  try {
    await setMetrics(catId, productIds.length, auctionIds.length, productIds, auctionIds);
    leafUpdated++;
    const catDoc = await db.collection("categories").doc(catId).get();
    const parentIds = catDoc.exists ? (catDoc.data().parentIds ?? []) : [];
    for (const ancestorId of parentIds) {
      if (!ancestorAggregates[ancestorId]) ancestorAggregates[ancestorId] = { productDelta: 0, auctionDelta: 0 };
      ancestorAggregates[ancestorId].productDelta += productIds.length;
      ancestorAggregates[ancestorId].auctionDelta += auctionIds.length;
    }
  } catch (err) {
    leafErrors++;
    console.error(`✗ Failed to update category ${catId}:`, err instanceof Error ? err.message : err);
  }
}

const ancestorEntries = Object.entries(ancestorAggregates);
let ancestorErrors = 0;
for (const [ancestorId, { productDelta, auctionDelta }] of ancestorEntries) {
  try {
    await setMetrics(ancestorId, productDelta, auctionDelta, [], []);
  } catch (err) {
    ancestorErrors++;
    console.error(`✗ Failed to update ancestor category ${ancestorId}:`, err instanceof Error ? err.message : err);
  }
}

console.log(
  `✓ Reconciliation complete — ${leafUpdated}/${leafEntries.length} leaf categories, ${ancestorEntries.length} ancestor categories updated` +
    (leafErrors || ancestorErrors ? ` (${leafErrors + ancestorErrors} errors)` : ""),
);
process.exit(leafErrors + ancestorErrors > 0 ? 1 : 0);
