#!/usr/bin/env node
/**
 * backfill-search-txt — populate `searchTxt` on documents already in Firestore.
 *
 * `searchTxt` is a normalized edge-n-gram array: the write paths build it from
 * the document's own content, but only for documents written AFTER that landed.
 * Everything already in the database has either the old `searchTokens` field or
 * nothing at all, and an `array-contains` query against a missing field matches
 * zero rows — silently, which is how FAQ search returned nothing for every query
 * for as long as it did.
 *
 * Idempotent: recomputes tokens and skips the write when they already match, so
 * re-running is free and a partially-migrated collection is safe.
 *
 * Also drops the superseded `searchTokens` field in the same write.
 *
 * Usage (from the consumer project root):
 *   node appkit/scripts/backfill-search-txt.mjs --dry-run
 *   node appkit/scripts/backfill-search-txt.mjs --collections faqs
 *   node appkit/scripts/backfill-search-txt.mjs
 *
 * Exit: 0 = success, 1 = errors during run, 2 = misconfiguration.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
/*
 * 🛑 From `../dist`, which means this script requires `npm --prefix appkit run
 * build` to have run — the same requirement the seed CLI already has. A stale
 * dist here would backfill tokens the app no longer emits, which is the drift
 * this import exists to prevent, so it is checked rather than assumed.
 */
import { partAliasTokens } from "../dist/_internal/shared/search/part-aliases.js";

const rawArgs = process.argv.slice(2);
function flag(name, fallback = undefined) {
  const i = rawArgs.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = rawArgs[i + 1];
  return v && !v.startsWith("--") ? v : true;
}
const DRY_RUN = flag("dry-run", false) === true;
const SERVICE_ACCOUNT_OVERRIDE =
  typeof flag("service-account") === "string" ? flag("service-account") : null;
const ONLY = typeof flag("collections") === "string" ? flag("collections").split(",") : null;

// --- .env.local loader (same shape as the other appkit scripts) -------------
const repoRoot = process.cwd();
const envLocalPath = resolve(repoRoot, ".env.local");
if (existsSync(envLocalPath)) {
  for (const line of readFileSync(envLocalPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}

const required = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
];
const missing = required.filter((k) => !process.env[k]);
if (!SERVICE_ACCOUNT_OVERRIDE && missing.length > 0) {
  console.error(`✗ Missing required env vars: ${missing.join(", ")}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Tokenizer — MUST stay identical to appkit/src/utils/search-txt.ts.
// Re-implemented rather than imported because this script has to run against a
// checkout whose appkit/dist may be stale, and a backfill computed with a
// different tokenizer than the query side is worse than no backfill at all.
// If you change the shape there, change it here in the same commit.
// ---------------------------------------------------------------------------
const MAX_PREFIX_LENGTH = 12;
const MAX_TOKENS = 600;
const LONG_WORD_LIMIT = 24;

function normalize(input) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildSearchTxt(sources) {
  const text = sources
    .flat()
    .filter((v) => typeof v === "string" && v.length > 0)
    .join(" ");
  const words = normalize(text).split(" ").filter(Boolean);

  const tokens = new Set();
  for (const word of words) {
    tokens.add(word);
    if (word.length > LONG_WORD_LIMIT) continue;
    const upper = Math.min(word.length, MAX_PREFIX_LENGTH);
    for (let n = 1; n <= upper; n++) tokens.add(word.slice(0, n));
    if (tokens.size >= MAX_TOKENS) break;
  }
  return Array.from(tokens).slice(0, MAX_TOKENS);
}

const stripHtml = (s) => String(s ?? "").replace(/<[^>]+>/g, " ");

// ---------------------------------------------------------------------------
// Which fields feed each collection's searchTxt.
//
// Each entry MUST list the same sources, in the same order, as the write path
// it mirrors — the tokenizer above being identical is not enough. A source
// present on one side and absent on the other produces documents that are
// findable by a term only if they happen to have been written by the right
// path, and no error is raised on either side.
//
//   faqs                 → buildFaqSearchTxt      (features/faq/repository/faqs.repository.ts)
//   products             → buildProductSearchTxt  (features/products/repository/products.repository.ts)
//   testerChecklistItems → tester-checklist-item.repository.ts
//
// NOTE: PII must never appear here — searchTxt stores readable fragments, so
// indexing an encrypted field would undo the encryption (decision D1).
// ---------------------------------------------------------------------------
/*
 * The warehouse location (C4), mirroring `physicalLocationTokens` in
 * appkit/src/utils/physical-location.ts.
 *
 * 🛑 A hand-mirror, and `audit-search-parity` is what keeps it honest — it
 * failed the moment the builder gained this field and this file had not. That
 * is the audit doing its job: there are THREE copies of every searchTxt
 * derivation (the builder, the seed wrapper, this backfill) and two of them
 * have silently diverged before. A term the app indexes and the backfill does
 * not is a row that matches when written through the UI and never when
 * written by a reseed.
 *
 * Both separators are emitted so a prefix of the whole label matches, which is
 * the query that makes "what is in bin A-3" work at all.
 */
function locationTokens(loc) {
  if (!loc || typeof loc !== "object") return [];
  const parts = [loc.zone, loc.shelf, loc.bin]
    .map((p) => (p ?? "").trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) return [];
  return [...parts, parts.join("-"), parts.join("/")];
}

/**
 * MIRRORS `appkit/src/_internal/shared/search/alias-variants.ts`.
 *
 * 🛑 This copy exists for the reason stated at the top of this file — the
 * backfill must run against a checkout whose appkit/dist is stale — and it is
 * the copy `audit-search-parity` R1 CANNOT see. R1 compares FIELD NAMES, and
 * these variants are generated from `title` / `name`, which are already in
 * both lists. So the rule reports clean while a misspelling matches a row
 * written through the app and never a row written by a reseed. Keep the two in
 * step by hand, and change them together.
 *
 * Why it is needed at all: `buildSearchTxt` stores PREFIXES, and "dragon" is
 * not a prefix of "dragoon" — they diverge at the sixth character. Measured:
 * tokens for "Dragoon G" are `dragoon d dr dra drag drago dragoo g`, which
 * contains "dragon" nowhere.
 */
const ALIAS_MAX_VARIANTS_PER_WORD = 4;
const ALIAS_MIN_WORD_LENGTH = 4;
const ALIAS_SUFFIX_SWAPS = [
  ["us", "is"], ["us", "as"], ["er", "ar"], ["ze", "se"],
  ["ic", "ec"], ["on", "an"], ["el", "al"],
];
function aliasVariantsForWord(word) {
  const w = (word ?? "").trim().toLowerCase();
  if (w.length < ALIAS_MIN_WORD_LENGTH) return [];
  const candidates = [];
  for (let i = 0; i < w.length - 1; i++) {
    if (w[i] === w[i + 1]) candidates.push(w.slice(0, i) + w.slice(i + 1));
  }
  for (const [a, b] of ALIAS_SUFFIX_SWAPS) {
    if (w.endsWith(a)) candidates.push(w.slice(0, -a.length) + b);
    if (w.endsWith(b)) candidates.push(w.slice(0, -b.length) + a);
  }
  const seen = new Set();
  for (const v of candidates) {
    if (v === w || w.startsWith(v)) continue;
    if (v.length < ALIAS_MIN_WORD_LENGTH) continue;
    seen.add(v);
    if (seen.size >= ALIAS_MAX_VARIANTS_PER_WORD) break;
  }
  return [...seen];
}
function aliasVariantsForName(name) {
  const words = (name ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set();
  for (const w of words) for (const v of aliasVariantsForWord(w)) out.add(v);
  return [...out];
}

const SOURCES = {
  faqs: (d) => [d.question, d.category, ...(d.tags ?? []), stripHtml(d.answer?.text ?? d.answer)],
  products: (d) => [
    d.title, d.description, d.brand, d.brandSlug,
    d.categoryNames, d.tags, d.features, d.condition,
    // card.*/grading.* match zero documents in the current Beyblade-only
    // catalogue, but buildProductSearchTxt indexes them: omitting them here
    // would make the first graded or carded listing findable by set name only
    // when written through the app, never when written by this backfill.
    d.card?.setName, d.card?.cardNumber, d.grading?.service,
    (d.specifications ?? []).map((s) => `${s.name} ${s.value}`),
    locationTokens(d.physicalLocation),
    /*
     * D2 Fix 3 — the part code ⇄ name bridge.
     *
     * 🛑 IMPORTED from the built dist, not re-implemented here, and that is a
     * deliberate departure from this file's other generators.
     *
     * F1 #29 records the exact defect: `audit-search-parity`'s R1 compares the
     * FIELD NAMES this map reads against the builder's, and these tokens come
     * from `title`/`specifications`, which are already in both lists — so R1
     * reports clean while the two implementations diverge. It has happened:
     * a heredoc ate a backslash, this file's split regex became `/s+/`, and it
     * emitted `["dragon g"]` where appkit emitted `["dragon","dragoan"]`.
     *
     * A copy cannot drift if there is no copy. The older
     * `aliasVariantsForWord`/`aliasVariantsForName` above remain duplicated
     * and should move the same way; that is a separate change with its own
     * output comparison.
     */
    partAliasTokens([
      d.title ?? "",
      ...(d.specifications ?? []).map((sp) => `${sp.name} ${sp.value}`),
    ].join(" ")),
  ],
  testerChecklistItems: (d) => [d.label, d.description, d.groupLabel, d.pageLabel],
  // Mirrors buildCategorySearchTxt. `ancestors[].name` is the load-bearing one
  // — it is what makes a tier-4 model findable by its lineage ("burst" reaches
  // a model filed under Beyblade Burst). `createdBy` is a raw uid and
  // `createdByStoreName` is operator identity; neither may feed searchTxt (D1).
  // `aliases` is LAST, matching the builder's order, because buildSearchTxt
  // truncates at 600 tokens SILENTLY — whatever sits at the end is dropped
  // first, and a model leaf's own name and lineage must outrank its "also
  // known as" spellings. For a named-model leaf the aliases carry the Hasbro
  // name and the product code, so this is what makes a row findable by "Lost
  // Longinus" when its stored name is "Luinor L2".
  categories: (d) => [
    d.name, d.slug, stripHtml(d.description), d.path, d.itemCode, d.brandCountry,
    (d.ancestors ?? []).map((a) => a.name),
    d.aliases ?? [],
    // Mirrors the builder: generated AFTER the authored aliases, so the guess
    // is what the 600-token cap drops first, and generated from name + aliases
    // only (never `description`/`path`).
    aliasVariantsForName([d.name, ...(d.aliases ?? [])].filter(Boolean).join(" ")),
  ],
  stores: (d) => [d.storeName, stripHtml(d.storeDescription), d.storeCategory],
  events: (d) => [d.title, stripHtml(d.description), d.type, d.tags ?? []],
  // `content` is deliberately excluded — see buildBlogSearchTxt. Blog bodies
  // are an order of magnitude past the 600-token cap, and buildSearchTxt
  // truncates SILENTLY, so the tail of every post would be unsearchable.
  blogPosts: (d) => [d.title, stripHtml(d.excerpt), d.category, d.tags ?? []],
  // `userName` is PII and encrypted — indexing it would undo the encryption (D1).
  reviews: (d) => [d.title, stripHtml(d.comment), d.productTitle],
  // userName/userEmail/sellerEmail are ORDER_PII_FIELDS and shippingAddress
  // is address-shaped — none may feed searchTxt (D1).
  coupons: (d) => [d.code, d.name, d.description],
  // buyerName/buyerEmail/sellerName are OFFER_PII_FIELDS; sellerNote is
  // private correspondence and has no business being substring-findable.
  offers: (d) => [d.productTitle, d.productSlug, d.storeName],
  orders: (d) => [
    d.productTitle, d.storeName, d.trackingNumber,
    (d.items ?? []).map((i) => i.productTitle),
    locationTokens(d.physicalLocation),
  ],
};

function parsePrivateKey(raw) {
  return raw?.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

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

const BATCH_LIMIT = 400;
const sameTokens = (a, b) =>
  Array.isArray(a) && a.length === b.length && a.every((v, i) => v === b[i]);

let hadError = false;

for (const [collection, sourcesFor] of Object.entries(SOURCES)) {
  if (ONLY && !ONLY.includes(collection)) continue;

  try {
    const snap = await db.collection(collection).get();
    let scanned = 0;
    let written = 0;
    let pending = [];

    for (const doc of snap.docs) {
      scanned += 1;
      const data = doc.data();
      const next = buildSearchTxt(sourcesFor(data));

      const needsTokens = !sameTokens(data.searchTxt, next);
      const needsCleanup = data.searchTokens !== undefined;
      if (!needsTokens && !needsCleanup) continue;

      const patch = { searchTxt: next };
      if (needsCleanup) patch.searchTokens = admin.firestore.FieldValue.delete();

      written += 1;
      pending.push({ ref: doc.ref, patch });

      if (pending.length >= BATCH_LIMIT) {
        if (!DRY_RUN) {
          const batch = db.batch();
          for (const p of pending) batch.update(p.ref, p.patch);
          await batch.commit();
        }
        pending = [];
      }
    }

    if (pending.length > 0 && !DRY_RUN) {
      const batch = db.batch();
      for (const p of pending) batch.update(p.ref, p.patch);
      await batch.commit();
    }

    const verb = DRY_RUN ? "would update" : "updated";
    console.log(`${collection.padEnd(22)} scanned ${String(scanned).padStart(5)} · ${verb} ${written}`);
  } catch (err) {
    hadError = true;
    console.error(`✗ ${collection}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log(hadError ? "\n✗ Completed with errors" : "\n✓ Done");
process.exit(hadError ? 1 : 0);
