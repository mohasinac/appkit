#!/usr/bin/env node
/**
 * migrate-listing-type-value — rewrite `products.listingType` from one
 * literal value to another, for documents ALREADY carrying the old value.
 *
 * ── WHY THIS EXISTS, SEPARATELY FROM backfill-listing-type.mjs ────────────
 *
 * `backfill-listing-type.mjs` has the OPPOSITE guard: it only touches
 * documents MISSING `listingType` entirely, and fills them with a default.
 * This script is for the mirror case — a `listingType` RENAME (the string
 * value itself changes meaning, e.g. a payment-aggregator-optics rename of
 * `"prize-draw"` -> `"random-lots"`). A document here already has a real,
 * intentional value; the job is to move it to its new spelling, never to
 * guess or default anything.
 *
 * Editing the seed SOURCE file alone does not do this: `appkit-seed load`
 * writes with `set(..., { merge: true })`, which can never change an
 * already-written field value on a document that already exists under the
 * SAME id. Worse, a listing-type rename often changes the id/slug prefix too
 * (`prizedraw-...` -> `randomlots-...`), so the reseed creates a *new*
 * document at the new id rather than touching the old one at all — this
 * script is what moves the OLD document's stored field so it is not left
 * behind silently matching nothing (Root Cause #58's failure mode: a value
 * that matches no query is as good as absent).
 *
 * ── REUSABLE, NOT HARDCODED ────────────────────────────────────────────────
 *
 * Takes `--from` / `--to` on the command line rather than hardcoding
 * "prize-draw"/"random-lots", so the same script serves the next rename
 * (e.g. `auction` -> `collector-drop`) without being copied.
 *
 * Talks directly to Firestore via firebase-admin — no dev server, no deploy.
 *
 * Usage (from consumer project root, e.g. d:/proj/letitrip.in):
 *   node appkit/scripts/migrate-listing-type-value.mjs --from prize-draw --to random-lots --dry-run
 *   node appkit/scripts/migrate-listing-type-value.mjs --from prize-draw --to random-lots --yes
 *   node appkit/scripts/migrate-listing-type-value.mjs --from prize-draw --to random-lots --yes --service-account <key.json>
 *
 * Idempotent: a second run finds zero documents with the OLD value (they all
 * now carry the new one) and writes nothing.
 *
 * Exit: 0 = success, 1 = errors during run, 2 = misconfiguration.
 *
 * @tag domain:products
 * @tag layer:script
 * @tag access:node-only
 * @tag sideEffects:firestore-write
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
const SERVICE_ACCOUNT_OVERRIDE =
  typeof flag("service-account") === "string" ? flag("service-account") : null;
const DRY_RUN = flag("dry-run", false) === true;
const CONFIRMED = flag("yes", false) === true;
const FROM_VALUE = typeof flag("from") === "string" ? flag("from") : null;
const TO_VALUE = typeof flag("to") === "string" ? flag("to") : null;

if (!FROM_VALUE || !TO_VALUE) {
  console.error('✗ Both --from <oldValue> and --to <newValue> are required.');
  console.error("  Example: node appkit/scripts/migrate-listing-type-value.mjs --from prize-draw --to random-lots --dry-run");
  process.exit(2);
}
if (FROM_VALUE === TO_VALUE) {
  console.error(`✗ --from and --to are both "${FROM_VALUE}" — nothing to migrate.`);
  process.exit(2);
}

if (!DRY_RUN && !CONFIRMED) {
  console.error(
    "✗ Refusing to write without --yes. Re-run with --dry-run to preview, or --yes to apply.",
  );
  process.exit(2);
}

// ---------------------------------------------------------------------------
// .env.local loader (same shape as seed-cli.mjs / backfill-listing-type.mjs)
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

const required = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
];
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
console.log(`• Migrating products.listingType: "${FROM_VALUE}" -> "${TO_VALUE}"`);
if (DRY_RUN) console.log("• DRY RUN — no writes will be made\n");

const BATCH_LIMIT = 500; // Firestore write-batch hard ceiling

/*
 * 🛑 Read every product and filter IN MEMORY, never
 * `where("listingType","==",FROM_VALUE)` — a Firestore equality is fine here
 * SINCE we WANT only exact matches (unlike the backfill script's missing-field
 * case), but `.select()` keeps the read cheap and in-memory filtering keeps
 * this script's behaviour consistent and auditable with its sibling.
 */
const snap = await db.collection("products").select("listingType", "title", "slug").get();
console.log(`• ${snap.size} product${snap.size === 1 ? "" : "s"} scanned`);

const needsMigration = [];
const valueCounts = new Map();
for (const doc of snap.docs) {
  const current = doc.get("listingType");
  if (typeof current === "string" && current.trim() !== "") {
    valueCounts.set(current, (valueCounts.get(current) ?? 0) + 1);
  }
  if (current === FROM_VALUE) {
    needsMigration.push({
      id: doc.id,
      title: doc.get("title") ?? "(untitled)",
      slug: doc.get("slug") ?? doc.id,
    });
  }
}

console.log(`• current listingType distribution:`);
for (const [t, n] of [...valueCounts].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${t.padEnd(14)} ${n}`);
}
console.log(`• matching "${FROM_VALUE}": ${needsMigration.length} -> will be set to "${TO_VALUE}"`);
for (const r of needsMigration.slice(0, 20)) {
  console.log(`    ${r.id.padEnd(46)} ${r.title}`);
}
if (needsMigration.length > 20) console.log(`    … ${needsMigration.length - 20} more`);

if (needsMigration.length === 0) {
  console.log(`\n✓ Nothing to do — no product carries listingType "${FROM_VALUE}".`);
  process.exit(0);
}

if (DRY_RUN) {
  console.log(`\n• DRY RUN complete — ${needsMigration.length} document(s) would be updated.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Write, in batches
// ---------------------------------------------------------------------------
let written = 0;
let errors = 0;
for (let i = 0; i < needsMigration.length; i += BATCH_LIMIT) {
  const slice = needsMigration.slice(i, i + BATCH_LIMIT);
  const batch = db.batch();
  for (const r of slice) {
    /*
     * `update`, not `set({merge:true})`: update FAILS on a document that no
     * longer exists (deleted between scan and write), where a merge-set would
     * silently CREATE a listing holding nothing but a listingType.
     */
    batch.update(db.collection("products").doc(r.id), {
      listingType: TO_VALUE,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  try {
    await batch.commit();
    written += slice.length;
    console.log(`  ✓ batch ${Math.floor(i / BATCH_LIMIT) + 1}: ${slice.length} updated`);
  } catch (err) {
    errors += slice.length;
    console.error(`  ✗ batch ${Math.floor(i / BATCH_LIMIT) + 1} failed: ${err?.message ?? err}`);
  }
}

console.log(`\n${errors === 0 ? "✓" : "⚠"} ${written} updated, ${errors} failed`);
process.exit(errors === 0 ? 0 : 1);
