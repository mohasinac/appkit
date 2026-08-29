#!/usr/bin/env node
/**
 * backfill-user-roles — retire the four boolean flags on `users` that were
 * replaced by roles, permissions, and a single ban field.
 *
 * ## What it migrates
 *
 *   isTester: true        ->  role: "tester"                    (W2b)
 *   canTestAdmin: true    ->  permissions += "tester:admin-surfaces"
 *   isDisabled: true      ->  disabled: true                    (W2e)
 *
 * ## Why the code does NOT depend on this having run
 *
 * Every read path was shipped dual-reading, deliberately:
 *
 *   `isTesterUser`        role === "tester"  ||  isTester === true
 *   `canTestAdminSurfaces` permissions.includes(...) || canTestAdmin === true
 *   `isAccountDisabled`   disabled === true  ||  isDisabled === true
 *
 * So this is a CLEANUP that lets the legacy fields and their fallbacks be
 * deleted — not a prerequisite. Nothing breaks if it never runs; what breaks is
 * deleting the fallbacks before it does.
 *
 * The `isDisabled` case is the one that matters most, and it is worth stating
 * plainly: before 2026-08-29 no ban path wrote `disabled`, so every guard —
 * all of which read `disabled` — let banned users through on an existing
 * session. The dual read closed that immediately; this reconciles the data so
 * the second field can go.
 *
 * ## Safety
 *
 * - Dry run by default in the sense that matters: `--dry-run` prints the exact
 *   per-document patch and writes nothing. ALWAYS run that first.
 * - Idempotent. A user already carrying `role: "tester"` is skipped, as is one
 *   whose permissions already include the grant.
 * - NEVER downgrades. A user whose role outranks `tester` (admin, employee,
 *   moderator) keeps their role and only has the flag cleared — promoting an
 *   admin's `isTester: true` into `role: "tester"` would be a privilege
 *   DEMOTION, which is the one irreversible mistake available here.
 * - Legacy flags are cleared only with `--drop-legacy`, so the default run is
 *   purely additive and reversible.
 *
 * Usage (from the consumer project root):
 *   node appkit/scripts/backfill-user-roles.mjs --dry-run
 *   node appkit/scripts/backfill-user-roles.mjs
 *   node appkit/scripts/backfill-user-roles.mjs --drop-legacy
 *   node appkit/scripts/backfill-user-roles.mjs --service-account <key.json>
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
const DROP_LEGACY = flag("drop-legacy", false) === true;
const SERVICE_ACCOUNT_OVERRIDE =
  typeof flag("service-account") === "string" ? flag("service-account") : null;

const repoRoot = process.cwd();
const require = createRequire(resolve(repoRoot, "package.json"));

// Load .env.local the same way the sibling backfills do.
const envPath = resolve(repoRoot, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, k, rawV] = m;
    if (process.env[k] !== undefined) continue;
    process.env[k] = rawV.replace(/^["']|["']$/g, "");
  }
}

let admin;
try {
  admin = require("firebase-admin");
} catch {
  console.error("✗ firebase-admin not resolvable from the consumer root.");
  process.exit(2);
}

function parsePrivateKey(raw) {
  return raw?.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

if (!admin.apps.length) {
  try {
    if (SERVICE_ACCOUNT_OVERRIDE) {
      const key = JSON.parse(readFileSync(resolve(repoRoot, SERVICE_ACCOUNT_OVERRIDE), "utf8"));
      admin.initializeApp({ credential: admin.credential.cert(key) });
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID?.trim(),
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim(),
          privateKey: parsePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
        }),
      });
    }
  } catch (err) {
    console.error(`✗ Could not initialise firebase-admin: ${err.message}`);
    process.exit(2);
  }
}

const db = admin.firestore();
console.log(`✓ Connected to project: ${process.env.FIREBASE_ADMIN_PROJECT_ID || "(service-account)"}`);
if (DRY_RUN) console.log("• DRY RUN — no writes will be made");
if (!DROP_LEGACY) console.log("• Additive only — legacy flags kept (pass --drop-legacy to clear them)");
console.log();

const TESTER_PERMISSION = "tester:admin-surfaces";
/** Roles that must never be overwritten by `tester` — doing so is a demotion. */
const OUTRANKS_TESTER = new Set(["admin", "employee", "moderator"]);

const BATCH_LIMIT = 400;
let hadError = false;

const stats = {
  scanned: 0,
  roleToTester: 0,
  roleKeptOutranking: 0,
  permissionGranted: 0,
  disabledReconciled: 0,
  legacyCleared: 0,
  unchanged: 0,
};

try {
  const snap = await db.collection("users").get();
  stats.scanned = snap.size;

  const pending = [];

  for (const doc of snap.docs) {
    const u = doc.data();
    const patch = {};

    // ── isTester -> role: "tester" ───────────────────────────────────────────
    if (u.isTester === true && u.role !== "tester") {
      if (OUTRANKS_TESTER.has(u.role)) {
        // Keep the higher role. `isEffectiveAdminUser` already treats an admin
        // as admin; rewriting them to `tester` would strip real privileges.
        stats.roleKeptOutranking += 1;
      } else {
        patch.role = "tester";
        stats.roleToTester += 1;
      }
    }

    // ── canTestAdmin -> permissions[] ────────────────────────────────────────
    const perms = Array.isArray(u.permissions) ? u.permissions : [];
    if (u.canTestAdmin === true && !perms.includes(TESTER_PERMISSION)) {
      patch.permissions = [...perms, TESTER_PERMISSION];
      stats.permissionGranted += 1;
    }

    // ── isDisabled -> disabled ───────────────────────────────────────────────
    if (u.isDisabled === true && u.disabled !== true) {
      patch.disabled = true;
      stats.disabledReconciled += 1;
    }

    if (DROP_LEGACY) {
      const del = admin.firestore.FieldValue.delete();
      let cleared = false;
      for (const legacy of ["isTester", "canTestAdmin", "isDisabled"]) {
        if (u[legacy] !== undefined) {
          patch[legacy] = del;
          cleared = true;
        }
      }
      if (cleared) stats.legacyCleared += 1;
    }

    if (Object.keys(patch).length === 0) {
      stats.unchanged += 1;
      continue;
    }

    const describe = Object.entries(patch)
      .map(([k, v]) => `${k}=${v && v.constructor?.name === "FieldValue" ? "<delete>" : JSON.stringify(v)}`)
      .join(" ");
    console.log(`  ${doc.id}  ${describe}`);
    pending.push({ ref: doc.ref, patch });
  }

  if (!DRY_RUN && pending.length > 0) {
    for (let i = 0; i < pending.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      for (const p of pending.slice(i, i + BATCH_LIMIT)) batch.update(p.ref, p.patch);
      await batch.commit();
    }
  }

  console.log(`
── Summary ────────────────────────────────────────────
  users scanned            ${stats.scanned}
  role -> "tester"         ${stats.roleToTester}
  role kept (outranks)     ${stats.roleKeptOutranking}
  ${TESTER_PERMISSION}  ${stats.permissionGranted}
  disabled reconciled      ${stats.disabledReconciled}
  legacy flags cleared     ${stats.legacyCleared}
  unchanged                ${stats.unchanged}
${DRY_RUN ? "\n  DRY RUN — nothing was written." : ""}`);
} catch (err) {
  hadError = true;
  console.error(`✗ ${err.message}`);
}

process.exit(hadError ? 1 : 0);
