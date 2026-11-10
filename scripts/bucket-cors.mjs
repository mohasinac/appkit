/**
 * Read or update the Storage bucket's CORS allowlist.
 *
 * ## Why this is needed
 *
 * Browser uploads go straight to GCS via a signed PUT — that is deliberate, it
 * bypasses the 4.5 MB Vercel function cap. But a signed URL does not exempt
 * the request from CORS: the browser still preflights against the BUCKET's
 * allowlist, not the app's.
 *
 * Measured 2026-11-10: the allowlist carried the apex, www, the vercel.app
 * host, tools. and two localhost ports — and **no subdomain**. So every
 * contest upload from `events.<domain>` died `net::ERR_FAILED` at the PUT,
 * with everything either side of that hop verified working. A photo contest
 * nobody can upload a photo to.
 *
 * ## Usage, from the repo root
 *   node appkit/scripts/bucket-cors.mjs                 # print current config
 *   node appkit/scripts/bucket-cors.mjs --add-subdomains --dry-run
 *   node appkit/scripts/bucket-cors.mjs --add-subdomains
 *
 * 🛑 MERGES, never replaces. Existing origins are preserved — the apex and
 * www are how the main shop uploads today, and dropping them to add the
 * subdomains would trade one outage for another.
 *
 * Requires `roles/storage.admin` (the Firebase admin SA already has it).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");
const ADD = argv.includes("--add-subdomains");

const envPath = resolve(process.cwd(), ".env.local");
if (!existsSync(envPath)) { console.error("✗ no .env.local at " + envPath); process.exit(2); }
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

const BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID.trim(),
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL.trim(),
    privateKey: pk(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
  }),
  storageBucket: BUCKET,
});

const bucket = admin.storage().bucket(BUCKET);
const [meta] = await bucket.getMetadata();
const current = meta.cors ?? [];

console.log("\n  bucket: " + BUCKET + "\n");
console.log("  CURRENT CORS:");
for (const rule of current) {
  console.log("    methods: " + (rule.method ?? []).join(","));
  for (const o of rule.origin ?? []) console.log("      " + o);
}

if (!ADD) { console.log("\n  (read-only; pass --add-subdomains to modify)\n"); process.exit(0); }

/*
 * Derived from the configured sibling origins rather than typed as literals —
 * these repos are domain-independent products and a hostname literal here
 * would be the same brand leak already recorded elsewhere.
 */
const originsArg = (() => {
  const i = argv.indexOf("--origins");
  return i === -1 ? "" : (argv[i + 1] ?? "");
})();

const wanted = [
  ...originsArg.split(",").map((s) => s.trim()).filter(Boolean),
  /*
   * The env fallback only fires when the sibling origins happen to be in the
   * SHOP's .env.local. They usually are not — each app carries its own
   * origins in its own Vercel project — so `--origins` is the normal path.
   * Passing them as an argument also keeps hostname literals out of this
   * file, which matters: appkit is a domain-independent product and a real
   * host in its source is the brand leak already recorded in CLAUDE.md.
   */
  process.env.NEXT_PUBLIC_EVENTS_ORIGIN,
  process.env.NEXT_PUBLIC_BLOGS_ORIGIN,
  process.env.NEXT_PUBLIC_AUTH_ORIGIN,
  process.env.NEXT_PUBLIC_SHOP_ORIGIN,
  process.env.NEXT_PUBLIC_AUDIT_ORIGIN,
]
  .map((v) => (v ?? "").trim().replace(/\/+$/, ""))
  .filter((v) => /^https?:\/\//.test(v));

if (!wanted.length) {
  console.error("\n✗ No sibling origins configured in .env.local — nothing to add.");
  process.exit(2);
}

/*
 * One rule carries the upload verbs. A signed PUT preflights with
 * Content-Type, and the response headers the client must be able to READ are
 * listed in responseHeader — without ETag the upload "succeeds" while the
 * client cannot confirm it.
 */
const UPLOAD_METHODS = ["GET", "HEAD", "PUT", "POST", "DELETE"];
const RESPONSE_HEADERS = [
  "Content-Type", "Content-Length", "ETag", "x-goog-resumable",
  "Access-Control-Allow-Origin",
];

const next = current.map((r) => ({ ...r }));
let rule = next.find((r) => (r.method ?? []).includes("PUT"));
if (!rule) {
  rule = { origin: [], method: UPLOAD_METHODS, responseHeader: RESPONSE_HEADERS, maxAgeSeconds: 3600 };
  next.push(rule);
}
const before = new Set(rule.origin ?? []);
const added = wanted.filter((o) => !before.has(o));
rule.origin = [...before, ...added];
rule.method = [...new Set([...(rule.method ?? []), ...UPLOAD_METHODS])];
rule.responseHeader = [...new Set([...(rule.responseHeader ?? []), ...RESPONSE_HEADERS])];

console.log("\n  WOULD ADD (" + added.length + "):");
for (const o of added) console.log("      + " + o);
if (!added.length) console.log("      (nothing — all already present)");

if (DRY) { console.log("\n-- dry run, bucket unchanged --\n"); process.exit(0); }
if (!added.length) { console.log("\n  no change needed\n"); process.exit(0); }

await bucket.setMetadata({ cors: next });
const [after] = await bucket.getMetadata();
console.log("\n  CONFIRMED on the bucket:");
for (const r of after.cors ?? []) {
  if (!(r.method ?? []).includes("PUT")) continue;
  for (const o of r.origin ?? []) console.log("      " + o);
}
console.log("");
process.exit(0);
