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
// Which fields feed each collection's searchTxt. Mirrors the per-feature
// builders (buildFaqSearchTxt, withProductSearchTxt, …).
// NOTE: PII must never appear here — searchTxt stores readable fragments, so
// indexing an encrypted field would undo the encryption (decision D1).
// ---------------------------------------------------------------------------
const SOURCES = {
  faqs: (d) => [d.question, d.category, ...(d.tags ?? []), stripHtml(d.answer?.text ?? d.answer)],
  products: (d) => [
    d.title, d.description, d.brand, d.brandSlug,
    d.categoryNames, d.tags, d.features, d.condition,
    (d.specifications ?? []).map((s) => `${s.name} ${s.value}`),
  ],
  testerChecklistItems: (d) => [d.label, d.description, d.groupLabel, d.pageLabel],
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
