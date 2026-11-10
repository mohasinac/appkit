/**
 * Upload an image THROUGH the media subdomain and attach it to an event.
 *
 * 🛑 This deliberately does NOT write to Firebase Storage directly, even
 * though the admin SDK in this process could. Owner's rule (2026-11-10):
 *
 *   "any image uploaded in any of the subdomains, they have to call the
 *    media subdomain for the saving and processing, as well as the
 *    retrievals"
 *
 * A direct `bucket.file().save()` would produce the right bytes by the wrong
 * route — no `mediaAssets` row, no magic-byte check, no watermark, no trust
 * flags, and a URL the media proxy can only resolve through its raw-path
 * backward-compatibility branch. It would also set the precedent this rule
 * exists to prevent.
 *
 * So it walks the real seam, exactly as a browser would:
 *
 *   1. mint a `__session` cookie for the admin (custom token → ID token →
 *      session cookie), because `createRouteHandler` authenticates by
 *      cookie, not by bearer token
 *   2. POST  media/api/media/sign      → signed PUT URL + storagePath
 *   3. PUT   the bytes straight to GCS (bypasses the 4.5 MB function cap)
 *   4. POST  media/api/media/finalize  → magic-byte check, mediaAssets row,
 *                                        /media/<shortId>
 *   5. PUT   events/api/admin/events/<id> with the new coverImage, so the
 *      EVENTS app promotes the staged object out of tmp/ and owns its own
 *      document — this host never reaches into another's data.
 *
 * Usage, from the repo root:
 *   node appkit/scripts/upload-via-media.mjs --file <path> --event <id> [--dry-run]
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { createRequire } from "node:module";

const argv = process.argv.slice(2);
const arg = (n) => {
  const i = argv.indexOf("--" + n);
  return i === -1 ? undefined : argv[i + 1];
};
const DRY = argv.includes("--dry-run");
const FILE = arg("file");
const EVENT_ID = arg("event");

if (!FILE) {
  console.error("usage: node appkit/scripts/upload-via-media.mjs --file <path> [--event <id>] [--dry-run]");
  process.exit(2);
}

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

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID.trim(),
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL.trim(),
    privateKey: pk(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
  }),
});

const MEDIA = (process.env.NEXT_PUBLIC_MEDIA_ORIGIN || "https://media.letitrip.in").replace(/\/+$/, "");
const EVENTS = (process.env.NEXT_PUBLIC_EVENTS_ORIGIN || "https://events.letitrip.in").replace(/\/+$/, "");
const WEB_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@letitrip.in";

const src = resolve(process.cwd(), FILE);
if (!existsSync(src)) {
  console.error("✗ file not found: " + src);
  process.exit(2);
}
const bytes = readFileSync(src);
const contentType = src.endsWith(".png") ? "image/png"
  : src.endsWith(".webp") ? "image/webp"
  : src.endsWith(".jpg") || src.endsWith(".jpeg") ? "image/jpeg"
  : "application/octet-stream";

console.log("");
console.log("  media host : " + MEDIA);
console.log("  events host: " + EVENTS);
console.log("  file       : " + basename(src) + "  " + (bytes.length / 1024).toFixed(0) + " KB  " + contentType);
console.log("  event      : " + (EVENT_ID ?? "(none — upload only)"));
console.log("");

if (DRY) {
  console.log("-- dry run, nothing uploaded --");
  process.exit(0);
}

// ── 1. a real session cookie for the admin ────────────────────────────────
const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
const customToken = await admin.auth().createCustomToken(user.uid, { role: "admin" });

const signInRes = await fetch(
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=" + WEB_KEY,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  },
);
const signIn = await signInRes.json();
if (!signIn.idToken) {
  console.error("✗ custom-token exchange failed: " + JSON.stringify(signIn).slice(0, 300));
  process.exit(1);
}
const sessionCookie = await admin
  .auth()
  .createSessionCookie(signIn.idToken, { expiresIn: 60 * 60 * 1000 });
const COOKIE = "__session=" + sessionCookie;
console.log("✓ session cookie minted for " + ADMIN_EMAIL);

// ── 2. ask media for a signed PUT ─────────────────────────────────────────
const signRes = await fetch(MEDIA + "/api/media/sign", {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: COOKIE },
  body: JSON.stringify({
    contentType,
    size: bytes.length,
    folder: "editorial",
    isPublic: true,
    /*
     * `event-cover` is the purpose-built context — appkit derives the SEO
     * filename from it (`event-<title>-image-1.<ext>`) and stamps
     * `contextType` on the mediaAssets row, which is what lets the watermark
     * resolver treat this as editorial artwork rather than a user upload.
     * `title` is its one required field; a context missing a field its
     * filename pattern needs is refused with MEDIA_CONTEXT_INVALID.
     */
    context: { type: "event-cover", title: "Diwali Photo Contest", ext: "png" },
  }),
});
const signBody = await signRes.json();
if (!signRes.ok || !signBody?.data?.uploadUrl) {
  console.error("✗ /api/media/sign → " + signRes.status + " " + JSON.stringify(signBody).slice(0, 400));
  process.exit(1);
}
const { uploadUrl, storagePath } = signBody.data;
console.log("✓ signed PUT issued → " + storagePath);

// ── 3. the bytes go straight to GCS ───────────────────────────────────────
const putRes = await fetch(uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": contentType },
  body: bytes,
});
if (!putRes.ok) {
  console.error("✗ PUT to storage → " + putRes.status + " " + (await putRes.text()).slice(0, 300));
  process.exit(1);
}
console.log("✓ bytes uploaded");

// ── 4. finalize: magic-byte check, mediaAssets row, public id ─────────────
const finRes = await fetch(MEDIA + "/api/media/finalize", {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: COOKIE },
  body: JSON.stringify({ storagePath, isPublic: true }),
});
const finBody = await finRes.json();
if (!finRes.ok) {
  console.error("✗ /api/media/finalize → " + finRes.status + " " + JSON.stringify(finBody).slice(0, 400));
  process.exit(1);
}
console.log("✓ finalized: " + JSON.stringify(finBody.data).slice(0, 300));

const shortId = finBody.data?.shortId ?? finBody.data?.id;
const mediaUrl = shortId ? "/media/" + shortId : finBody.data?.url;
console.log("✓ media URL: " + mediaUrl);

if (!EVENT_ID) process.exit(0);

// ── 5. the EVENTS app updates its own document ────────────────────────────
const evRes = await fetch(EVENTS + "/api/admin/events/" + encodeURIComponent(EVENT_ID), {
  // PATCH, not PUT — the events admin route exports GET/PATCH/DELETE only,
  // and a PUT is answered 405 by the framework before the handler runs.
  method: "PATCH",
  headers: { "Content-Type": "application/json", Cookie: COOKIE },
  body: JSON.stringify({
    coverImage: {
      type: "image",
      url: mediaUrl,
      alt: "Diwali event poster — share a Diwali-themed Beyblade photo to win one of three exclusive Beyblades",
    },
  }),
});
const evBody = await evRes.text();
console.log("events admin PATCH → " + evRes.status + " " + evBody.slice(0, 300));
process.exit(evRes.ok ? 0 : 1);
