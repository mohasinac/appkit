#!/usr/bin/env node
/**
 * backfill-user-slugs — mint a public profile slug for every existing user.
 *
 * Usage (from the consumer project root):
 *   node appkit/scripts/backfill-user-slugs.mjs --dry-run
 *   node appkit/scripts/backfill-user-slugs.mjs
 *
 * Flags: --dry-run, --service-account <path>, --verbose
 *
 * Idempotent: a user who already has `slug` is skipped, and a reservation
 * already held by that same uid is treated as won rather than re-minted.
 *
 * 🛑 The derivation below MIRRORS `appkit/src/features/auth/actions/user-slug.ts`
 * and must stay identical. It is re-implemented rather than imported for the
 * same reason `backfill-search-txt.mjs` re-implements its tokenizer: this has to
 * run against a checkout whose appkit/dist may be stale, and a backfill that
 * derives differently from the write path is worse than no backfill.
 *
 * 🛑 NEVER derive a slug from email or phone. `generateUserId` used to append
 * the email local-part, putting it in a public URL. Two signup paths ALSO set
 * displayName to that local-part, so the email is passed here purely to detect
 * and reject that case.
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
const VERBOSE = flag("verbose", false) === true;
const SERVICE_ACCOUNT_OVERRIDE =
  typeof flag("service-account") === "string" ? flag("service-account") : null;

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

// --- derivation (mirror of user-slug.ts) ------------------------------------
const RESERVED = new Set([
  "admin", "administrator", "api", "app", "auth", "login", "logout", "register",
  "signup", "signin", "new", "edit", "delete", "settings", "me", "self", "user",
  "users", "profile", "profiles", "store", "stores", "seller", "sellers",
  "support", "help", "about", "contact", "search", "null", "undefined", "root",
  "system", "moderator", "staff", "team", "official", "letitrip",
  "overview", "catalogue",
]);
const EMPTY_NAMES = new Set(["", "user", "anonymous", "null", "undefined"]);
const MAX_BASE_LENGTH = 40;

/** Mirror of appkit's `slugify`. */
function slugify(input) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function userSlugBase(displayName, email) {
  const base = slugify(displayName).slice(0, MAX_BASE_LENGTH);
  if (!base || EMPTY_NAMES.has(base)) return "member";
  const localPart = String(email ?? "").split("@")[0] ?? "";
  if (localPart && slugify(localPart) === base) return "member";
  return base;
}

// --- firebase ---------------------------------------------------------------
const parsePrivateKey = (raw) =>
  raw?.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
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

const USER_SLUGS = "userSlugs";

async function claim(uid, base) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (RESERVED.has(candidate)) continue;
    if (DRY_RUN) {
      const snap = await db.collection(USER_SLUGS).doc(candidate).get();
      if (!snap.exists || snap.data()?.uid === uid) return candidate;
      continue;
    }
    const won = await db.runTransaction(async (tx) => {
      const ref = db.collection(USER_SLUGS).doc(candidate);
      const snap = await tx.get(ref);
      if (snap.exists) return snap.data()?.uid === uid;
      tx.set(ref, { uid, createdAt: new Date() });
      return true;
    });
    if (won) return candidate;
  }
  return null;
}

const snap = await db.collection("users").get();
let scanned = 0, updated = 0, skipped = 0, failed = 0, collisions = 0;

for (const doc of snap.docs) {
  scanned++;
  const d = doc.data();
  if (typeof d.slug === "string" && d.slug) { skipped++; continue; }

  const base = userSlugBase(d.displayName, d.email);
  const slug = await claim(doc.id, base);
  if (!slug) { failed++; continue; }
  if (slug !== base) collisions++;

  if (!DRY_RUN) await doc.ref.update({ slug });
  updated++;
  if (VERBOSE) console.log(`  ${doc.id} -> ${slug}`);
}

console.log(
  `users  scanned ${String(scanned).padStart(4)} · ` +
  `${DRY_RUN ? "would update" : "updated"} ${String(updated).padStart(4)} · ` +
  `already had ${skipped} · with collision suffix ${collisions} · failed ${failed}`,
);
// `member` is the fallback for an absent/email-derived display name — a large
// count here means many accounts will share `member-N`, which is expected
// rather than an error, but worth seeing before committing.
console.log("\n✓ Done");
process.exit(0);
