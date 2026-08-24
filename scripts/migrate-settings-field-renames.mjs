#!/usr/bin/env node
/**
 * migrate-settings-field-renames — one-off data migration for the 2026-08-24
 * site-settings wiring fixes. Idempotent: safe to re-run.
 *
 * Talks directly to Firestore via firebase-admin — no dev server, no deploy.
 * Touches exactly one document: siteSettings/global.
 *
 * What it fixes, and why each was broken:
 *
 * 1. credentials.razorpaySecret -> credentials.razorpayKeySecret
 *    The admin form wrote `razorpaySecret`, a name nothing on the server ever
 *    read. The field the Razorpay client actually uses is `razorpayKeySecret`
 *    (`integration-keys.ts` -> `providers.config.ts`), and it had no input in
 *    the UI at all — so the Razorpay secret was effectively unconfigurable
 *    through the admin panel. Both names are encrypted with the same
 *    `encryptSecret` scheme, so this is a pure key rename of the ciphertext:
 *    the value is moved verbatim and never decrypted here.
 *
 * 2. credentials.smtpPassword -> deleted
 *    Zero consumers anywhere in the codebase. Transactional email goes through
 *    Resend (`resendApiKey`). An encrypted secret nobody reads is pure risk.
 *
 * 3. announcementBar.text -> announcementBar.message
 *    `AdminSiteSettingsView` saved the banner copy under `text`, but
 *    `AnnouncementBar` and the homepage both read `message` — so anything
 *    typed into the main Site Settings editor saved successfully and then
 *    never appeared on the site. `message` is canonical.
 *
 * Usage (from the consumer project root, e.g. d:/proj/letitrip.in):
 *   node appkit/scripts/migrate-settings-field-renames.mjs --dry-run
 *   node appkit/scripts/migrate-settings-field-renames.mjs
 *   node appkit/scripts/migrate-settings-field-renames.mjs --service-account <path-to-key.json>
 *
 * Exit: 0 = success (including "nothing to do"), 1 = error, 2 = misconfiguration.
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
const DRY_RUN = flag("dry-run") === true;
const SERVICE_ACCOUNT_OVERRIDE =
  typeof flag("service-account") === "string" ? flag("service-account") : null;

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
  console.error("  Either set them in .env.local or pass --service-account <path-to-key.json>");
  process.exit(2);
}

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
const { FieldValue } = admin.firestore;
console.log(`✓ Connected to project: ${process.env.FIREBASE_ADMIN_PROJECT_ID || "(service-account)"}`);
if (DRY_RUN) console.log("— DRY RUN: no writes will be performed —");

const DOC_PATH = "siteSettings/global";

async function main() {
  const ref = db.doc(DOC_PATH);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log(`• ${DOC_PATH} does not exist — nothing to migrate.`);
    return 0;
  }

  const data = snap.data() ?? {};
  const credentials = data.credentials ?? {};
  const announcementBar = data.announcementBar ?? {};

  /** @type {Record<string, unknown>} */
  const update = {};
  const actions = [];

  // 1 — razorpaySecret -> razorpayKeySecret (ciphertext moved verbatim)
  const legacyRazorpay = credentials.razorpaySecret;
  if (typeof legacyRazorpay === "string" && legacyRazorpay.trim()) {
    if (credentials.razorpayKeySecret) {
      actions.push(
        "credentials.razorpayKeySecret already set — dropping the legacy razorpaySecret without overwriting",
      );
    } else {
      update["credentials.razorpayKeySecret"] = legacyRazorpay;
      actions.push("credentials.razorpaySecret -> credentials.razorpayKeySecret");
    }
    update["credentials.razorpaySecret"] = FieldValue.delete();
  }

  // 2 — drop the unread smtpPassword secret
  if (credentials.smtpPassword !== undefined) {
    update["credentials.smtpPassword"] = FieldValue.delete();
    actions.push("credentials.smtpPassword -> deleted (no consumers; email goes through Resend)");
  }

  // 3 — announcementBar.text -> announcementBar.message
  const legacyText = announcementBar.text;
  if (typeof legacyText === "string" && legacyText.trim()) {
    const currentMessage =
      typeof announcementBar.message === "string" ? announcementBar.message.trim() : "";
    if (currentMessage) {
      actions.push(
        "announcementBar.message already set — dropping the legacy text without overwriting",
      );
    } else {
      update["announcementBar.message"] = legacyText;
      actions.push("announcementBar.text -> announcementBar.message");
    }
    update["announcementBar.text"] = FieldValue.delete();
  }

  if (actions.length === 0) {
    console.log("• Nothing to migrate — the document is already in the new shape.");
    return 0;
  }

  console.log(`\nPlanned changes to ${DOC_PATH}:`);
  for (const a of actions) console.log(`  • ${a}`);

  if (DRY_RUN) {
    console.log("\n— DRY RUN: no writes performed. Re-run without --dry-run to apply. —");
    return 0;
  }

  await ref.update(update);
  console.log(`\n✓ Applied ${actions.length} change(s) to ${DOC_PATH}.`);
  console.log("  Note: the in-process settings cache lives for 60s and the integration-key");
  console.log("  cache is invalidated on the next admin save — restart the server if you");
  console.log("  need the new values picked up immediately.");
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("✗ Migration failed:", err?.message ?? err);
    process.exit(1);
  });
