#!/usr/bin/env node
/*
 * backfill-blind-index.mjs — write `*TokensIndex` over existing PII.
 *
 * ## 🛑 It decrypts to index, so it must run with the real keys
 *
 * The plaintext never leaves this process: it is read through the
 * repository (which decrypts on read), tokenised, hashed, and only the
 * digests are written. Nothing is logged but counts.
 *
 * ## 🛑 Re-runnable, and it records WHICH KEY wrote each index
 *
 * Rotating `PII_HMAC_KEY` invalidates every digest written before it, and
 * the failure is SILENT — searches stop matching, which reads as "no such
 * user" rather than as a broken index. So each document records
 * `blindIndexKeyVersion`, and a run skips documents already written by the
 * current key. Without that, a rotation means rewriting every document
 * blind and hoping, and a half-finished rotation is undetectable.
 *
 * ## 🛑 `--dry-run` is the default
 *
 * This writes to `users`, which is in the tester harness's PRESERVE tier —
 * real accounts. A backfill over it should take an explicit `--write`.
 *
 * Usage:
 *   node appkit/scripts/backfill-blind-index.mjs                 # dry run
 *   node appkit/scripts/backfill-blind-index.mjs --write
 *   node appkit/scripts/backfill-blind-index.mjs --write --collection users
 */

import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/*
 * 🛑 BOTH halves of the shim, or every repository read fails.
 *
 * `providers/db-firebase/admin.ts` calls `module.require("firebase-admin/
 * firestore")`, not the bare name — so a pure-ESM entry must provide
 * `globalThis.module` as well as `globalThis.require` (Root Cause #24).
 * Without the `module` half the symptom is not an import error: it is a job
 * that logs "complete" having written nothing, because every row threw
 * `module is not defined` into a per-row catch.
 */
const require = createRequire(join(ROOT, "package.json"));
globalThis.require = require;
globalThis.module = { require };

function loadEnv() {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const argv = process.argv.slice(2);
const WRITE = argv.includes("--write");
const only = argv.includes("--collection") ? argv[argv.indexOf("--collection") + 1] : null;

/**
 * Which plaintext fields feed each collection's token index.
 *
 * 🛑 An explicit list per collection, never "every PII field". `phone` is
 * deliberately absent from `users`: a phone number has no word boundaries,
 * so tokenising it yields one token that is the whole number — an exact
 * lookup the existing `phoneIndex` already provides, with none of this
 * field's extra surface. Adding it would duplicate a capability and double
 * the digests to analyse.
 */
const TARGETS = [
  { collection: "users", from: ["displayName", "email"], field: "nameTokensIndex" },
  { collection: "payouts", from: ["sellerName", "sellerEmail"], field: "sellerTokensIndex" },
  {
    collection: "addresses",
    from: ["fullName"],
    field: "nameTokensIndex",
    // Address rows are the most sensitive of the three; only the NAME is
    // indexed. The street line is never tokenised — "find everyone on
    // Brigade Road" is not a capability admin needs and is the single most
    // re-identifying thing in the document.
  },
];

const admin = require("firebase-admin");
const sa = require(join(ROOT, "firebase-admin-key.json"));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const { buildTokensIndex, BLIND_INDEX_KEY_VERSION_FIELD } = await import(
  new URL(`file:///${join(ROOT, "appkit", "dist", "security", "blind-index-tokens.js").replace(/\\/g, "/")}`).href
);

/** Bumped by hand when `PII_HMAC_KEY` is rotated. */
const KEY_VERSION = Number(process.env.PII_HMAC_KEY_VERSION ?? "1");

console.log(`\nblind-index backfill — ${WRITE ? "WRITING" : "DRY RUN"}, key version ${KEY_VERSION}\n`);

let grandTotal = 0;
for (const target of TARGETS) {
  if (only && target.collection !== only) continue;

  const snap = await db.collection(target.collection).get();
  let written = 0;
  let skipped = 0;
  let empty = 0;

  /*
   * `BulkWriter`, never a hand-sized `db.batch()`. A 400-document batch over
   * fat documents dies with `3 INVALID_ARGUMENT: Transaction too big`, and a
   * hand-tuned batch size is a guess that breaks on the next collection.
   */
  const writer = db.bulkWriter();

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data[BLIND_INDEX_KEY_VERSION_FIELD] === KEY_VERSION && Array.isArray(data[target.field])) {
      skipped++;
      continue;
    }
    const values = target.from.map((f) => data[f]).filter((v) => typeof v === "string");
    const tokens = buildTokensIndex(...values);
    if (tokens.length === 0) {
      empty++;
      continue;
    }
    written++;
    if (WRITE) {
      void writer.update(doc.ref, {
        [target.field]: tokens,
        [BLIND_INDEX_KEY_VERSION_FIELD]: KEY_VERSION,
      });
    }
  }

  if (WRITE) await writer.close();
  grandTotal += written;
  console.log(
    `  ${target.collection.padEnd(12)} ${String(snap.size).padStart(5)} docs · ` +
      `${String(written).padStart(5)} to write · ${String(skipped).padStart(5)} already current · ` +
      `${String(empty).padStart(5)} nothing to index`,
  );
}

console.log(
  WRITE
    ? `\nDone — ${grandTotal} document(s) updated.\n`
    : `\nDry run — ${grandTotal} document(s) WOULD be updated. Re-run with --write.\n`,
);
process.exit(0);
