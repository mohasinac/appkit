#!/usr/bin/env node
/**
 * purge-tester-sandbox — standalone on-demand purge of the shared tester QA sandbox.
 *
 * Talks directly to Firestore via firebase-admin — does not require the Next.js dev
 * server or a deployed Cloud Function. Wipes every isTestData:true document across the
 * sandbox collections (categories, stores, products, blogPosts, events) plus any bids
 * referencing a deleted test product, regardless of testDataExpiresAt.
 *
 * This mirrors runTesterSandboxCleanup(ctx, { force: true }) in
 * appkit/src/_internal/server/jobs/core/testerSandboxCleanup.ts — the scheduled
 * Firebase Function (testerSandboxCleanup, daily 05:00 UTC) does the same sweep but
 * respects testDataExpiresAt. Keep them in sync.
 *
 * Usage (from consumer project root, e.g. d:/proj/letitrip.in):
 *   node appkit/scripts/purge-tester-sandbox.mjs
 *   node appkit/scripts/purge-tester-sandbox.mjs --service-account <path-to-key.json>
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

// ---------------------------------------------------------------------------
// .env.local loader (same shape as seed-cli.mjs / firebase-reset.mjs)
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

// ---------------------------------------------------------------------------
// Purge — mirrors runTesterSandboxCleanup(ctx, { force: true })
// ---------------------------------------------------------------------------
const SANDBOX_COLLECTIONS = ["categories", "stores", "products", "blogPosts", "events"];
const BID_CHUNK_SIZE = 30; // Firestore `in` query cap
const BATCH_LIMIT = 500; // Firestore write-batch hard ceiling

async function batchDelete(refs) {
  let deleted = 0;
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const slice = refs.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    for (const ref of slice) batch.delete(ref);
    await batch.commit();
    deleted += slice.length;
  }
  return deleted;
}

const allRefs = [];
let deletedProductIds = [];

for (const collection of SANDBOX_COLLECTIONS) {
  const snap = await db.collection(collection).where("isTestData", "==", true).limit(200).get();
  allRefs.push(...snap.docs.map((d) => d.ref));
  if (collection === "products") {
    deletedProductIds = snap.docs.map((d) => d.id);
  }
}

for (let i = 0; i < deletedProductIds.length; i += BID_CHUNK_SIZE) {
  const chunk = deletedProductIds.slice(i, i + BID_CHUNK_SIZE);
  if (chunk.length === 0) continue;
  const snap = await db.collection("bids").where("productId", "in", chunk).get();
  allRefs.push(...snap.docs.map((d) => d.ref));
}

if (allRefs.length === 0) {
  console.log("No tester sandbox test data found — nothing to purge.");
  process.exit(0);
}

console.log(`Purging ${allRefs.length} tester sandbox document(s)...`);
const deleted = await batchDelete(allRefs);
console.log(`✓ Purged ${deleted} document(s).`);
process.exit(0);
