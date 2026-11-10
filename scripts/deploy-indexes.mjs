/**
 * Deploy composite indexes to a NAMED Firestore database.
 *
 * ## Why this exists
 *
 * The firebase CLI cannot do it. `--database` is accepted by
 * `firestore:indexes` (list) and **rejected by `deploy`**, and the documented
 * multi-database form in `firebase.json` crashes firebase-tools 14.21.0 with
 * `TypeError: Cannot read properties of undefined (reading 'map')`. So a named
 * database like `dev-db` has no supported CLI path at all.
 *
 * Meanwhile the 2026-11-09 reset deleted all 743 indexes on BOTH databases.
 * `(default)` was rebuilt by hand; `dev-db` still has **zero**, so every
 * composite query against it fails and the apps report "failed to fetch" —
 * which reads as a broken APP rather than a missing index.
 *
 * 🛑 REQUIRES `roles/datastore.indexAdmin` on the service account. Without it
 * every create returns `PERMISSION_DENIED` (measured: 720/720). The firebase
 * CLI succeeds where this fails only because it uses the logged-in USER's
 * credentials, not the service account's.
 *
 * ## Usage, from the repo root
 *   node appkit/scripts/deploy-indexes.mjs --database dev-db --dry-run
 *   node appkit/scripts/deploy-indexes.mjs --database dev-db
 *
 * `--database default` targets `(default)`, which is PRODUCTION. The resolved
 * target is printed before anything is created, and --dry-run resolves the
 * identical value.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const argv = process.argv.slice(2);
const arg = (n) => {
  const i = argv.indexOf("--" + n);
  return i === -1 ? undefined : argv[i + 1];
};
const DRY = argv.includes("--dry-run");
const DB_ARG = arg("database") ?? process.env.FIREBASE_SHOP_DATABASE_ID ?? "dev-db";
const DATABASE = DB_ARG === "default" ? "(default)" : DB_ARG;

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

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");
const pk = (r) => (r && r.includes("\\n") ? r.replace(/\\n/g, "\n") : r);
const PROJECT = process.env.FIREBASE_ADMIN_PROJECT_ID.trim();

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: PROJECT,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL.trim(),
    privateKey: pk(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
  }),
});

const defPath = resolve(process.cwd(), "firestore.indexes.json");
const defs = JSON.parse(readFileSync(defPath, "utf8"));
const indexes = defs.indexes ?? [];

console.log("");
console.log("  project  : " + PROJECT);
console.log("  database : " + DATABASE + (DATABASE === "(default)" ? "   ← THIS IS PRODUCTION" : ""));
console.log("  source   : " + defPath);
console.log("  indexes  : " + indexes.length);
console.log("");

if (DRY) {
  const byCollection = {};
  for (const ix of indexes) byCollection[ix.collectionGroup] = (byCollection[ix.collectionGroup] ?? 0) + 1;
  const top = Object.entries(byCollection).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log("  top collection groups:");
  for (const [c, n] of top) console.log("    " + String(n).padStart(4) + "  " + c);
  console.log("\n-- dry run, nothing created --");
  process.exit(0);
}

const { access_token: token } = await app.options.credential.getAccessToken();

let created = 0, existed = 0, failed = 0;
const failures = [];

for (let i = 0; i < indexes.length; i++) {
  const ix = indexes[i];
  const url =
    "https://firestore.googleapis.com/v1/projects/" + PROJECT +
    "/databases/" + encodeURIComponent(DATABASE) +
    "/collectionGroups/" + encodeURIComponent(ix.collectionGroup) + "/indexes";

  /*
   * The REST shape differs from firestore.indexes.json: the file carries
   * `collectionGroup` as a sibling of `fields`, while the API takes it in the
   * URL and rejects it in the body. `queryScope` passes through unchanged.
   */
  const body = {
    queryScope: ix.queryScope ?? "COLLECTION",
    fields: (ix.fields ?? []).map((f) => {
      const out = { fieldPath: f.fieldPath };
      if (f.order) out.order = f.order;
      if (f.arrayConfig) out.arrayConfig = f.arrayConfig;
      if (f.vectorConfig) out.vectorConfig = f.vectorConfig;
      return out;
    }),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    created++;
  } else {
    const text = await res.text();
    if (/ALREADY_EXISTS|already exists/i.test(text)) {
      existed++;
    } else {
      failed++;
      if (failures.length < 5) failures.push(res.status + " " + text.slice(0, 200));
      /*
       * 🛑 Stop early on a permission wall. 720 identical PERMISSION_DENIED
       * responses take minutes and tell you nothing the first one didn't —
       * and the recorded failure mode for this exact script was 720/720.
       */
      if (res.status === 403 && failed >= 3) {
        console.error("\n✗ PERMISSION_DENIED three times — stopping.");
        console.error("  Grant roles/datastore.indexAdmin to:");
        console.error("  " + process.env.FIREBASE_ADMIN_CLIENT_EMAIL.trim());
        break;
      }
    }
  }

  if ((i + 1) % 50 === 0 || i === indexes.length - 1) {
    console.log("  " + (i + 1) + "/" + indexes.length +
      "  created=" + created + " existed=" + existed + " failed=" + failed);
  }
}

console.log("");
console.log("  created : " + created);
console.log("  existed : " + existed);
console.log("  failed  : " + failed);
for (const f of failures) console.log("    ! " + f);
console.log("");
console.log("  ⚠ New indexes come back CREATING and flip to READY over several");
console.log("    minutes. Queries that need them keep failing until they land.");
process.exit(failed > 0 ? 1 : 0);
