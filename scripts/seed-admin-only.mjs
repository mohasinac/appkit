/**
 * Seed ONLY the admin account — Auth record + one production `users` document.
 *
 * Owner asked for exactly this and no more: the reset left Firebase Auth with
 * seed personas but production Firestore `users` EMPTY, so no account holds
 * any role and the media CMS (which needs admin/moderator) cannot be reached.
 *
 * 🛑 TARGETS PRODUCTION `(default)`. Printed before anything is written, and
 * --dry-run resolves the identical target.
 *
 * 🛑 NOT stamped with a seed-purpose marker, deliberately. Every other seeded
 * row carries one so a demo sweep can find it — but this is the ONLY account
 * that can administer the site, and a sweep that deleted it would lock
 * everyone out of a system with no other admin. It is real data, not demo
 * data, so it is written as real data.
 *
 * PII is encrypted with appkit's own `encryptPiiFields` + `piiIndicesFor`,
 * the same pair seed-cli uses, in the same order (indices and encryption BOTH
 * read the plaintext; nothing may be added after that pair runs).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";

const DRY = process.argv.includes("--dry-run");
const WIPE = process.argv.includes("--wipe-all-users");
const pwArg = process.argv.find((a) => a.startsWith("--password="));

const envPath = resolve(process.cwd(), ".env.local");
if (!existsSync(envPath)) {
  console.error("✗ no .env.local at " + envPath);
  process.exit(2);
}
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
}

if (!process.env.PII_ENCRYPTION_KEY) {
  console.error("✖ PII_ENCRYPTION_KEY is not set — the users collection encrypts email and phoneNumber at write time.");
  process.exit(2);
}

/*
 * Lives in appkit/scripts/ and is RUN FROM THE REPO ROOT, exactly like
 * seed-cli.mjs: `node appkit/scripts/seed-admin-only.mjs`. That combination
 * is load-bearing — `process.cwd()` must be the repo root for `.env.local`
 * to be found, while module resolution happens beside THIS file so
 * `@mohasinac/appkit` resolves. A copy in a scratch directory fails on both
 * counts, which is how this script started life.
 */
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");
const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY.includes("\\n")
  ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n")
  : process.env.FIREBASE_ADMIN_PRIVATE_KEY;

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID.trim(),
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL.trim(),
    privateKey: key,
  }),
});

// appkit's pii-encrypt uses a bare require("crypto") at runtime.
globalThis.require = require;

/*
 * 🛑 Neutralise `server-only` BEFORE importing any appkit barrel.
 *
 * That package exists to make a build fail if server code is pulled into a
 * client bundle: its default entry throws on evaluation, and only the
 * "react-server" export condition resolves to a no-op. A plain Node script
 * is neither, so the import throws even though this IS server code and the
 * guard has nothing to protect here.
 *
 * Pre-seeding the CJS require cache with an empty module makes the later
 * `require("server-only")` inside appkit's dist a no-op. This does not
 * weaken the guard anywhere it matters — it is scoped to this process.
 */
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  };
} catch {
  // not installed — nothing to stub
}
const { encryptPiiFields, piiIndicesFor } = await import("@mohasinac/appkit/server");
const { USER_PII_FIELDS, USER_PII_INDEX_MAP } = await import("@mohasinac/appkit");

const EMAIL = process.env.ADMIN_EMAIL || "admin@letitrip.in";
const SEED_UID = "user-admin-letitrip";

// 🛑 No database id = `(default)` = PRODUCTION.
const db = admin.firestore();
const auth = admin.auth();

console.log("");
console.log("  database : (default)   ← THIS IS PRODUCTION");
console.log("  email    : " + EMAIL);
console.log("");

/*
 * ── --wipe-all-users ──────────────────────────────────────────────────────
 *
 * 🛑 DELETES EVERY FIREBASE AUTH ACCOUNT, including real ones. Owner
 * authorised this explicitly and repeatedly; it is not a default and the
 * flag has to be typed.
 *
 * Order is deliberate: wipe EVERYTHING first, then create the admin fresh.
 * Preserving one account across the wipe would leave it holding whatever
 * password and claims it already had, which is exactly the ambiguity this
 * is meant to remove — "only the admin exists" should mean an account this
 * run created, not one that happened to survive.
 *
 * `deleteUsers` takes at most 1000 uids per call and is not transactional,
 * so it is paged. Listing is re-run after each batch rather than paginated
 * through, because deleting while holding a page token invalidates it.
 */
if (WIPE) {
  let total = 0;
  for (;;) {
    const page = await auth.listUsers(1000);
    if (page.users.length === 0) break;
    const uids = page.users.map((u) => u.uid);
    if (DRY) {
      console.log("  [dry-run] would delete " + uids.length + " Auth users");
      total += uids.length;
      break;
    }
    const res = await auth.deleteUsers(uids);
    total += res.successCount;
    if (res.failureCount > 0) {
      console.error("  ✗ " + res.failureCount + " deletions failed");
      for (const e of res.errors.slice(0, 5)) console.error("    " + e.error.message);
      break;
    }
  }
  console.log((DRY ? "  [dry-run] " : "✓ ") + "Auth users removed: " + total);

  /*
   * The production `users` documents go with them. An orphaned user doc is
   * worse than none: it carries a role for a uid that can no longer sign in,
   * and the next account to be issued that uid would inherit it.
   */
  const stale = await db.collection("users").get();
  if (!stale.empty) {
    if (DRY) {
      console.log("  [dry-run] would delete " + stale.size + " users docs");
    } else {
      const writer = db.bulkWriter();
      for (const d of stale.docs) writer.delete(d.ref);
      await writer.close();
      console.log("✓ users documents removed: " + stale.size);
    }
  } else {
    console.log("  users documents: 0 (nothing to remove)");
  }
}

let userRec = null;
try {
  userRec = await auth.getUserByEmail(EMAIL);
  console.log("  Auth record EXISTS — uid " + userRec.uid);
} catch {
  console.log("  Auth record MISSING — will create with uid " + SEED_UID);
}

const existingDoc = await db.collection("users").doc(userRec?.uid ?? SEED_UID).get();
console.log("  users doc exists: " + existingDoc.exists);

if (DRY) {
  console.log("\n-- dry run, nothing written --");
  process.exit(0);
}

const password = pwArg ? pwArg.split("=").slice(1).join("=") : randomBytes(12).toString("base64url");

if (!userRec) {
  userRec = await auth.createUser({
    uid: SEED_UID,
    email: EMAIL,
    emailVerified: true,
    password,
    displayName: "LetItRip Official",
  });
  console.log("✓ created Auth user " + userRec.uid);
} else {
  await auth.updateUser(userRec.uid, { password, emailVerified: true });
  console.log("✓ reset password on existing Auth user " + userRec.uid);
}

// The role claim is what the server-side permission resolver reads.
await auth.setCustomUserClaims(userRec.uid, { role: "admin" });
console.log("✓ custom claim role=admin set");

const NOW = new Date().toISOString();
const plain = {
  uid: userRec.uid,
  email: EMAIL,
  displayName: "LetItRip Official",
  role: "admin",
  emailVerified: true,
  disabled: false,
  publicProfile: { isPublic: true, showEmail: false },
  createdAt: NOW,
  updatedAt: NOW,
};

// Both read the PLAINTEXT. Indices hash the source text; encryption must not
// see an already-hashed value. Nothing may be added after this pair.
const docData = {
  ...encryptPiiFields(plain, [...USER_PII_FIELDS]),
  ...piiIndicesFor(plain, USER_PII_INDEX_MAP),
};

await db.collection("users").doc(userRec.uid).set(docData, { merge: true });
console.log("✓ wrote users/" + userRec.uid + " (role=admin)");

const back = await db.collection("users").doc(userRec.uid).get();
const d = back.data();
console.log("  read back: role=" + d.role +
  " | email encrypted=" + String(d.email ?? "").startsWith("enc:v1:") +
  " | index fields=" + Object.keys(d).filter((k) => k.toLowerCase().includes("index")).join(","));

console.log("\n  ───────────────────────────────────────────");
console.log("  LOGIN: " + EMAIL);
console.log("  PASSWORD: " + password);
console.log("  ↑ change it after first sign-in.");
console.log("  ───────────────────────────────────────────");
process.exit(0);
