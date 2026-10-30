#!/usr/bin/env node
/**
 * backfill-listing-type — set `listingType` on product documents that lack it.
 *
 * ── 🛑 WHY A MISSING `listingType` IS INVISIBLE ────────────────────────────
 *
 * `normalizeListingType(p)` returns `p.listingType ?? "standard"`, so every
 * object anyone inspects — a detail page, a debugger, an API response — looks
 * perfectly correct. A Firestore equality cannot match a document that lacks
 * the field, and a QUERY is the only copy that decides what a listing page
 * returns. Root Cause #101, on the `listingType` axis: a read-side default with
 * no write-side counterpart is a field no query can see.
 *
 * Measured on this project 2026-10-14, before this script ran:
 *
 *   total products                       1039
 *   status == published                  1039
 *   listingType IN the general catalogue   35   <- /products shows THIRTY-FIVE
 *   partGlossaryId != null                752
 *
 * The 35 are exactly the seeded `inGeneralCatalogue` rows. The other **1,004
 * published listings were unreachable from `/products` and from every tab that
 * filters by type**, while still being publicly readable by slug. 968 of them
 * carried no `listingType` at all — one listing per taxonomy leaf (752 part
 * leaves + 216 bey-model leaves), written by a generator that is not in git.
 *
 * CLAUDE.md's J13 rule has required the field since SB1-G Phase 4 dropped the
 * legacy `isCollectorDrop` / `isPreOrder` booleans. This is the catch-up for rows that
 * predate, or were written around, that rule.
 *
 * ── 🛑 WHY "standard" AND NOT A GUESS PER ROW ──────────────────────────────
 *
 * `standard` is the only type whose capability set is "buy it now, nothing
 * special" — which is what a loose part or a used bey IS. Every other value
 * makes a claim the document cannot support: `collector drop` needs `collectorDropEndDate`,
 * `pre-order` a release date, `digital-code` a code pool, `classified` a
 * contact method. Inferring a richer type from a title would be inventing a
 * fact about real merchandise.
 *
 * It also matches what the app has been SHOWING all along, since
 * `normalizeListingType` already defaulted these to `standard` in memory — so
 * this makes the stored data agree with the rendered page rather than changing
 * any behaviour a visitor has seen.
 *
 * Talks directly to Firestore via firebase-admin — no dev server, no deploy.
 *
 * Usage (from consumer project root, e.g. d:/proj/letitrip.in):
 *   node appkit/scripts/backfill-listing-type.mjs --dry-run
 *   node appkit/scripts/backfill-listing-type.mjs --yes
 *   node appkit/scripts/backfill-listing-type.mjs --yes --type standard
 *   node appkit/scripts/backfill-listing-type.mjs --yes --service-account <key.json>
 *
 * Idempotent: a document that already carries any `listingType` is skipped and
 * never overwritten, so a second run writes nothing and a deliberate `collector drop`
 * can never be flattened to `standard`.
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
const FILL_TYPE = typeof flag("type") === "string" ? flag("type") : "standard";

/*
 * The nine members of the `ListingType` union. Hard-coded rather than imported
 * because this script must run with no build step — but validated against the
 * argument so a typo cannot write a value that matches no filter anywhere,
 * which is the exact defect this script exists to repair.
 */
const LISTING_TYPES = [
  "standard",
  "collector-drop",
  "pre-order",
  "prize-draw",
  "classified",
  "digital-code",
  "live",
  "art",
  "stickers",
];

if (!LISTING_TYPES.includes(FILL_TYPE)) {
  console.error(`✗ --type "${FILL_TYPE}" is not a ListingType.`);
  console.error(`  Valid: ${LISTING_TYPES.join(", ")}`);
  process.exit(2);
}

if (!DRY_RUN && !CONFIRMED) {
  console.error(
    "✗ Refusing to write without --yes. Re-run with --dry-run to preview, or --yes to apply.",
  );
  process.exit(2);
}

// ---------------------------------------------------------------------------
// .env.local loader (same shape as seed-cli.mjs / backfill-product-store-names.mjs)
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

const BATCH_LIMIT = 500; // Firestore write-batch hard ceiling

/*
 * 🛑 Read every product and filter IN MEMORY, never `where("listingType","==",null)`.
 *
 * A Firestore inequality or null-equality excludes documents that lack the
 * field, which is precisely the set being looked for — the query would return
 * the rows that are already fine and miss every broken one. The same trap
 * CLAUDE.md documents for `isTestData != true`.
 *
 * `.select("listingType","title")` keeps this to two fields per document rather
 * than full bodies, so a 1,039-row scan stays cheap against the read quota.
 */
const snap = await db.collection("products").select("listingType", "title").get();
console.log(`• ${snap.size} product${snap.size === 1 ? "" : "s"} scanned`);

const needsFill = [];
const alreadySet = new Map();
for (const doc of snap.docs) {
  const current = doc.get("listingType");
  if (typeof current === "string" && current.trim() !== "") {
    alreadySet.set(current, (alreadySet.get(current) ?? 0) + 1);
    continue;
  }
  needsFill.push({ id: doc.id, title: doc.get("title") ?? "(untitled)" });
}

console.log(`• already set : ${snap.size - needsFill.length}`);
for (const [t, n] of [...alreadySet].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${t.padEnd(14)} ${n}`);
}
console.log(`• missing     : ${needsFill.length}  -> will be set to "${FILL_TYPE}"`);
for (const r of needsFill.slice(0, 10)) console.log(`    ${r.id.padEnd(46)} ${r.title}`);
if (needsFill.length > 10) console.log(`    … ${needsFill.length - 10} more`);

if (needsFill.length === 0) {
  console.log("\n✓ Nothing to do — every product carries a listingType.");
  process.exit(0);
}

if (DRY_RUN) {
  console.log(`\n• DRY RUN complete — ${needsFill.length} document(s) would be updated.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Write, in batches
// ---------------------------------------------------------------------------
let written = 0;
let errors = 0;
for (let i = 0; i < needsFill.length; i += BATCH_LIMIT) {
  const slice = needsFill.slice(i, i + BATCH_LIMIT);
  const batch = db.batch();
  for (const r of slice) {
    /*
     * `update`, not `set({merge:true})`: update FAILS on a document that no
     * longer exists, where a merge-set would silently CREATE a listing holding
     * nothing but a listingType. A product that was deleted between the scan
     * and the write should drop out of the backfill, not be resurrected as a
     * husk that every listing query then returns.
     */
    batch.update(db.collection("products").doc(r.id), {
      listingType: FILL_TYPE,
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
