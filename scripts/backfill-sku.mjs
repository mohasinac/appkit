#!/usr/bin/env node
/**
 * backfill-sku — give every product document a `sku`.
 *
 * ── 🛑 WHY THIS EXISTS, AND WHY IT IS A SEPARATE FIELD ─────────────────────
 *
 * `barcodeId` was carrying two incompatible jobs. 23 seeded products held a
 * hand-authored SEMANTIC code (`LIR-BEY-X-005`) while everything created
 * through the app held `generateBarcodeId`'s SHA-1 form (`LIR-1A99AEA8`), so
 * the audit found both printed in one list and called it two barcode formats.
 * It was one field with two meanings:
 *
 *   `barcodeId`  the MACHINE key — fixed width, derived, scanned
 *   `sku`        the HUMAN key — meaningful, variable width, spoken
 *
 * The widths are the reason they cannot share a field: a label's geometry is
 * sized for its symbol, and the thermal presets derive a ~42 mm minimum from
 * the 12-character barcode form. A variable-width code in that field means one
 * product's label fits the stock and the next one's does not.
 *
 * ── 🛑 WHAT THE ABSENCE WAS COSTING ───────────────────────────────────────
 *
 * There was no `sku` field on `ProductDocument` at all, and yet:
 *
 *   · `/admin/products` rows read "No SKU" on EVERY row — a fallback for a
 *     field that had never existed, which reads as data about the record.
 *   · its toolbar advertised "Search products, SKUs, or seller names" over a
 *     `searchTxt` index containing neither, so searching returned a plausible
 *     EMPTY LIST — worse than a dead box, because it looks like an answer.
 *
 * Both were corrected to stop promising it. This script is what makes the
 * promise keepable again.
 *
 * ── 🛑 WHY A BACKFILL IS REQUIRED AND NOT OPTIONAL ────────────────────────
 *
 * `sku` is fed into `buildProductSearchTxt`, and `searchTxt` is STORED. A
 * document keeps the tokens it was written with until something re-saves it,
 * so adding the field to the builder makes SKU search true only for products
 * written AFTER the change. Until this runs, re-adding "SKU" to the admin
 * placeholder would be the same empty-list lie in a new coat.
 *
 * Usage (from consumer project root, e.g. d:/proj/letitrip.in):
 *   node appkit/scripts/backfill-sku.mjs --dry-run
 *   node appkit/scripts/backfill-sku.mjs --yes
 *   node appkit/scripts/backfill-sku.mjs --yes --service-account <key.json>
 *
 * Idempotent: a document that already carries a non-empty `sku` is skipped and
 * never overwritten, so a second run writes nothing and a hand-authored code
 * can never be replaced by a generated one.
 *
 * 🛑 It also REWRITES `searchTxt` for every row it touches, because a `sku`
 * the index cannot see is a `sku` no admin can find — which is the whole point
 * of running this. That means this script must build the same token list the
 * repository does; see `buildTokens` below for why it is duplicated rather
 * than imported.
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
if (DRY_RUN) console.log("• DRY RUN — no writes will be made\n");

const BATCH_LIMIT = 500;

/*
 * `generateSku`, duplicated.
 *
 * 🛑 Duplicated rather than imported, and the reason is the same one
 * `backfill-listing-type.mjs` records for the `ListingType` union: this script
 * must run with NO BUILD STEP. Importing from `@mohasinac/appkit` would read
 * the installed tarball's `dist`, which on the registry pin is a PUBLISHED
 * version — so a freshly written generator would not be the one that ran, and
 * the backfill would write codes that disagree with the ones the app produces
 * (Root Cause #28's shape, on the script axis).
 *
 * Kept byte-identical in behaviour to `appkit/src/utils/id-generators.ts`.
 * A change there is a change here.
 */
function skuToken(input, length) {
  const letters = (input ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return letters.slice(0, length);
}
function generateSku({ productId, categorySlug, brand, customId }) {
  if (customId && customId.trim()) return customId.trim();
  const token = skuToken(categorySlug, 4) || skuToken(brand, 4) || "GEN";
  let hash = 0;
  for (let i = 0; i < productId.length; i += 1) {
    hash = Math.imul(hash ^ productId.charCodeAt(i), 0x01000193);
  }
  const suffix = (hash >>> 0).toString(36).toUpperCase().padStart(5, "0").slice(-5);
  return `LIR-${token}-${suffix}`;
}

/*
 * `normalizeSearchText` + the token build, duplicated for the same reason.
 *
 * 🛑 This is the risky part of the script and is deliberately NARROW: it does
 * not rebuild the whole token list. It reads the document's EXISTING
 * `searchTxt` and adds the SKU's tokens to it.
 *
 * Rebuilding from scratch would mean re-implementing
 * `buildProductSearchTxt`'s full field list — title, description, brand,
 * categoryNames, tags, features, condition, card, grading, specifications AND
 * the part-code alias bridge — in a file that cannot import it. A divergent
 * copy would silently DESTROY tokens on every row it touched, and the failure
 * would surface as "search stopped finding things" long after the run.
 * Appending cannot lose anything.
 */
function normalizeSearchText(input) {
  return String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function skuTokens(sku) {
  const flat = normalizeSearchText(sku);
  if (!flat) return [];
  // The whole value and each word — `lir burs k3f9p` is searchable as any of
  // its parts, which is how someone reads a code off a label partially.
  return [...new Set([flat, ...flat.split(" ").filter(Boolean)])];
}

async function main() {
  const snap = await db.collection("products").get();
  console.log(`• products: ${snap.size}\n`);

  let haveSku = 0;
  const toWrite = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    if (typeof d.sku === "string" && d.sku.trim()) {
      haveSku += 1;
      continue;
    }
    const sku = generateSku({
      productId: doc.id,
      // The leaf is `categorySlugs[0]` — the closure is leaf-first.
      categorySlug: Array.isArray(d.categorySlugs) ? d.categorySlugs[0] : d.category,
      brand: d.brand,
    });
    const existing = Array.isArray(d.searchTxt) ? d.searchTxt : [];
    const merged = [...new Set([...existing, ...skuTokens(sku)])];
    toWrite.push({ ref: doc.ref, id: doc.id, sku, searchTxt: merged });
  }

  console.log(`  already had a sku : ${haveSku}`);
  console.log(`  to backfill       : ${toWrite.length}\n`);

  if (toWrite.length > 0) {
    console.log("  sample:");
    for (const w of toWrite.slice(0, 8)) console.log(`    ${w.id}  ->  ${w.sku}`);
    if (toWrite.length > 8) console.log(`    … +${toWrite.length - 8} more`);
    console.log("");
  }

  /*
   * 🛑 A COLLISION CHECK, before any write.
   *
   * The suffix is a 32-bit hash over the product id, so two ids CAN collide —
   * unlikely at this scale but not impossible, and a duplicate SKU is exactly
   * the thing a stock key must never have. Reported and refused rather than
   * written, because a human picking the tie-break is better than a script
   * inventing one.
   */
  const seen = new Map();
  for (const w of toWrite) {
    if (seen.has(w.sku)) {
      console.error(`✗ SKU collision: ${w.sku}`);
      console.error(`    ${seen.get(w.sku)}`);
      console.error(`    ${w.id}`);
      console.error("  Refusing to write. Author a distinct sku on one of them by hand.");
      process.exit(1);
    }
    seen.set(w.sku, w.id);
  }
  for (const doc of snap.docs) {
    const d = doc.data();
    if (typeof d.sku === "string" && d.sku.trim() && seen.has(d.sku.trim())) {
      console.error(`✗ A generated SKU collides with an existing one: ${d.sku.trim()}`);
      console.error(`    existing: ${doc.id}`);
      console.error(`    generated: ${seen.get(d.sku.trim())}`);
      process.exit(1);
    }
  }

  if (DRY_RUN || toWrite.length === 0) {
    console.log(DRY_RUN ? "• dry run complete — nothing written" : "• nothing to do");
    return;
  }

  let written = 0;
  for (let i = 0; i < toWrite.length; i += BATCH_LIMIT) {
    const chunk = toWrite.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    for (const w of chunk) {
      batch.update(w.ref, {
        sku: w.sku,
        searchTxt: w.searchTxt,
        updatedAt: new Date(),
      });
    }
    await batch.commit();
    written += chunk.length;
    console.log(`  committed ${written}/${toWrite.length}`);
  }
  console.log(`\n✓ backfilled ${written} product(s)`);
}

main().catch((err) => {
  console.error("✗ backfill failed:", err?.message ?? err);
  process.exit(1);
});
