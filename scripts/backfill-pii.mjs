#!/usr/bin/env node
/**
 * backfill-pii — re-encrypt PII fields that were written to Firestore in cleartext.
 *
 * Why this exists: `PayoutRepository.encryptPayoutData` and
 * `ReviewRepository.encryptReviewData` both did
 *
 *     encrypted = addPiiIndices(data, MAP)      // re-reads the PLAINTEXT `data`
 *     encrypted = { ...encryptPiiFields(data, FIELDS), ...encrypted }
 *
 * `addPiiIndices` returns `{...source, ...indices}`, so the second spread put the
 * plaintext back over the ciphertext. `payouts.sellerEmail`, `payouts.upiId` and
 * `reviews.userName` were therefore stored in the clear, each beside a perfectly
 * valid blind index. The code is fixed (`piiIndicesFor`); this repairs the rows
 * written while it was broken.
 *
 * Idempotent: a value already carrying the `enc:v1:` prefix is skipped, so this
 * is safe to re-run and safe to run against a partially-migrated collection.
 *
 * Usage (from the consumer project root):
 *   node appkit/scripts/backfill-pii.mjs --dry-run
 *   node appkit/scripts/backfill-pii.mjs
 *   node appkit/scripts/backfill-pii.mjs --collections payouts
 *   node appkit/scripts/backfill-pii.mjs --service-account <path-to-key.json>
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
// A scan of zero documents is indistinguishable from a wrong collection
// name, and it prints as a clean pass. That is how the `catalogue` typo
// above survived. Empty is now an ERROR unless the caller says it is
// expected — which turns this whole class of typo from silent to
// unmissable, for every target, permanently.
const ALLOW_EMPTY = flag("allow-empty", false) === true;
const SERVICE_ACCOUNT_OVERRIDE =
  typeof flag("service-account") === "string" ? flag("service-account") : null;
const ONLY = typeof flag("collections") === "string" ? flag("collections").split(",") : null;

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
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
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
  process.exit(2);
}

// The encryption key is the whole point — refuse to run without it rather than
// writing something that looks migrated and isn't.
const PII_KEY = (process.env.PII_ENCRYPTION_KEY ?? "").trim();
if (!/^[0-9a-fA-F]{64}$/.test(PII_KEY)) {
  console.error("✗ PII_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).");
  process.exit(2);
}
const HMAC_KEY = (process.env.PII_HMAC_KEY ?? PII_KEY).trim();

// ---------------------------------------------------------------------------
// Crypto — mirrors appkit/src/security/pii-encrypt.ts exactly.
// Deliberately re-implemented rather than imported: this script must run against
// a checkout whose appkit/dist may be stale, and the format is three lines.
// ---------------------------------------------------------------------------
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");
const { randomBytes, createCipheriv, createHmac } = require("node:crypto");

const ENC_PREFIX = "enc:v1:";
const HMAC_PREFIX = "hmac-sha256:";

function encryptValue(plaintext) {
  const key = Buffer.from(PII_KEY, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString("base64")}:${enc.toString("base64")}:${tag.toString("base64")}`;
}

function blindIndex(value) {
  const hex = createHmac("sha256", Buffer.from(HMAC_KEY, "hex")).update(value).digest("hex");
  return `${HMAC_PREFIX}${hex}`;
}

const isEncrypted = (v) => typeof v === "string" && v.startsWith(ENC_PREFIX);

// ---------------------------------------------------------------------------
// What to repair. Mirrors the *_PII_FIELDS / *_PII_INDEX_MAP pairs in
// appkit/src/security/pii-schemas.ts — keep in sync when a field is added there.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Path helpers — MUST mirror appkit/src/security/pii-encrypt.ts.
// A backfill that understands fewer path forms than the write path silently
// skips exactly the fields most likely to be missed by hand (nested, arrays).
// ---------------------------------------------------------------------------
function getPath(obj, path) {
  return path.split(".").reduce((acc, k) => (acc && typeof acc === "object" ? acc[k] : undefined), obj);
}
function setPath(obj, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  let cur = obj;
  for (const k of keys) {
    if (!cur[k] || typeof cur[k] !== "object") return;
    cur[k] = { ...cur[k] };
    cur = cur[k];
  }
  cur[last] = value;
}

/**
 * Encrypt one field spec on `doc`, in place. Supports:
 *   "email"              top-level
 *   "deviceInfo.ip"      dotted
 *   "messages[].body"    every element of an array
 * Returns true when something changed.
 */
function encryptField(doc, spec, indexField) {
  if (spec.includes("[]")) {
    const [arrayPath, rest] = spec.split("[]");
    const itemPath = rest.replace(/^\./, "");
    const arr = getPath(doc, arrayPath);
    if (!Array.isArray(arr)) return false;
    let changed = false;
    const next = arr.map((el) => {
      if (!el || typeof el !== "object") return el;
      const clone = { ...el };
      const v = itemPath ? getPath(clone, itemPath) : undefined;
      if (typeof v !== "string" || !v || isEncrypted(v)) return clone;
      setPath(clone, itemPath, encryptValue(v));
      changed = true;
      return clone;
    });
    if (changed) setPath(doc, arrayPath, next);
    return changed;
  }

  const nested = spec.includes(".");
  const v = nested ? getPath(doc, spec) : doc[spec];
  if (typeof v !== "string" || !v || isEncrypted(v)) return false;

  if (nested) {
    setPath(doc, spec, encryptValue(v));
  } else {
    doc[spec] = encryptValue(v);
    if (indexField) doc[indexField] = blindIndex(v);
  }
  return true;
}

// Every collection with PII declared in appkit/src/security/pii-schemas.ts.
// Keep in sync when a field is added there.
const TARGETS = [
  { collection: "payouts", fields: ["sellerEmail", "upiId"], indexMap: { sellerEmail: "sellerEmailIndex" } },
  { collection: "reviews", fields: ["userName"], indexMap: { userName: "userNameIndex" } },
  { collection: "bids", fields: ["userEmail"], indexMap: {} },
  { collection: "emailVerificationTokens", fields: ["email"], indexMap: { email: "emailIndex" } },
  { collection: "passwordResetTokens", fields: ["email"], indexMap: { email: "emailIndex" } },
  { collection: "newsletterSubscribers", fields: ["email"], indexMap: { email: "emailIndex" } },
  // nested
  { collection: "sessions", fields: ["deviceInfo.ip", "deviceInfo.userAgent", "location.city"], indexMap: {} },
  { collection: "supportTickets", fields: ["userEmail", "userDisplayName", "assignedToName"], indexMap: {} },
  // `catalogueItems`, matching CATALOGUE_COLLECTION. This said "catalogue"
  // — a collection that does not exist — so `db.collection(...).get()`
  // returned empty without error and the script printed a clean
  // `scanned 0 · repaired 0`. See the empty-scan guard below.
  { collection: "catalogueItems", fields: ["ownerEmail"], indexMap: {} },
  { collection: "payoutMethods", fields: ["upiVpa", "accountNumber", "ifscCode"], indexMap: {} },
  // `conversations` lived here until 2026-08-31 and was the only
  // array-of-objects (`messages[].body`) entry. Removed with the feature —
  // leaving it would print the clean `scanned 0 · repaired 0` this file's
  // own comment above warns is indistinguishable from success.
  // `users` already encrypts email/phoneNumber on write; this backfills the
  // MAPPED index name (`phoneIndex`), which encryptPiiFields never wrote —
  // findByPhone queried a field that only existed on seeded users.
  // `googleLinkedEmail` joined USER_PII_FIELDS on 2026-08-28 (found by
  // audit-pii-coverage): a real email written cleartext by the Google OAuth
  // callback, sitting beside the already-encrypted `email` on the same
  // document. New writes encrypt it; this backfills the rows written before.
  { collection: "users", fields: ["googleLinkedEmail"], indexMap: {}, reindexOnly: { phoneNumber: "phoneIndex" } },
];

function parsePrivateKey(raw) {
  return raw?.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
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

const BATCH_LIMIT = 400; // under Firestore's 500-op ceiling, leaving headroom
let hadError = false;

for (const target of TARGETS) {
  if (ONLY && !ONLY.includes(target.collection)) continue;

  try {
    const snap = await db.collection(target.collection).get();
    let scanned = 0;
    let repaired = 0;
    let pending = [];

    for (const doc of snap.docs) {
      scanned += 1;
      const data = doc.data();
      const patch = {};

      // Work on a shallow clone so nested/array writes do not mutate `data`.
      const draft = JSON.parse(JSON.stringify(data));
      let touched = false;
      for (const field of target.fields) {
        if (encryptField(draft, field, target.indexMap[field])) touched = true;
      }
      if (touched) {
        for (const field of target.fields) {
          const root = field.split(/[.[]/)[0];
          // A nested target (`location.city`, `deviceInfo.ip`) whose ROOT is
          // absent on this document yields `undefined`, and Firestore rejects
          // an update containing one — aborting the whole batch. There is
          // nothing to write for a field the document does not have, so skip
          // it. Sessions without `location` and payout methods that are bank
          // accounts rather than UPI both land here.
          if (draft[root] === undefined) continue;
          patch[root] = draft[root];
        }
        for (const idx of Object.values(target.indexMap)) {
          if (draft[idx] !== undefined) patch[idx] = draft[idx];
        }
      }

      // Index-only backfill: the value is already encrypted, but a blind index
      // under the MAPPED name was never written.
      for (const [src, idxField] of Object.entries(target.reindexOnly ?? {})) {
        if (data[idxField] !== undefined) continue;
        const raw = data[src];
        // Only derivable while the source is still plaintext.
        if (typeof raw === "string" && raw && !isEncrypted(raw)) {
          patch[idxField] = blindIndex(raw);
        }
      }

      if (Object.keys(patch).length === 0) continue;

      // Validate the patch HERE, so a dry run rejects a shape the real run
      // would reject. Without this the dry run never touches batch.update and
      // reports a clean plan for writes that cannot execute — the same
      // looks-successful failure as the zero-scan case above.
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) {
          throw new Error(
            `patch for ${doc.id} carries undefined at "${k}" — Firestore ` +
            `rejects that and it would abort the whole batch`,
          );
        }
      }

      repaired += 1;
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

    const verb = DRY_RUN ? "would repair" : "repaired";
    console.log(`${target.collection.padEnd(12)} scanned ${String(scanned).padStart(5)} · ${verb} ${repaired}`);

    if (scanned === 0 && !ALLOW_EMPTY) {
      hadError = true;
      console.error(
        `✗ ${target.collection}: scanned 0 documents. Either the collection` +
        ` name is wrong or it is genuinely empty — this script cannot tell` +
        ` the two apart, so it refuses to report success. Pass --allow-empty` +
        ` if you have confirmed it is empty.`,
      );
    }
  } catch (err) {
    hadError = true;
    console.error(`✗ ${target.collection}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log(hadError ? "\n✗ Completed with errors" : "\n✓ Done");
process.exit(hadError ? 1 : 0);
