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
const TARGETS = [
  { collection: "payouts", fields: ["sellerEmail", "upiId"], indexMap: { sellerEmail: "sellerEmailIndex" } },
  { collection: "reviews", fields: ["userName"], indexMap: { userName: "userNameIndex" } },
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

      for (const field of target.fields) {
        const value = data[field];
        // Only touch a real, non-empty, not-already-encrypted string. Anything
        // else is either absent or already migrated.
        if (typeof value !== "string" || !value || isEncrypted(value)) continue;
        patch[field] = encryptValue(value);
        const indexField = target.indexMap[field];
        if (indexField) patch[indexField] = blindIndex(value);
      }

      if (Object.keys(patch).length === 0) continue;
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
  } catch (err) {
    hadError = true;
    console.error(`✗ ${target.collection}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log(hadError ? "\n✗ Completed with errors" : "\n✓ Done");
process.exit(hadError ? 1 : 0);
