#!/usr/bin/env node
/**
 * firebase-storage-orphan-report.mjs — READ-ONLY report of Firebase Storage
 * objects under `media/**` that are not referenced by any live Firestore
 * document. Never deletes anything.
 *
 * "Keep only user data" (the ask this script answers) does not map onto a
 * folder split — seed/demo data never touches Storage at all (it's proxied
 * live from external URLs via seedExtMedia()/`/api/media/ext`). Every real
 * Storage object is either a live user upload or an orphan left behind by a
 * deleted domain document. This script finds the latter so a human can
 * review the list before any deletion is considered.
 *
 * Two-pass reference collection, mirroring the /media/[...slug] proxy's own
 * resolution order (src/app/api/media/[...slug]/route.ts):
 *   1. Every `mediaAssets/{shortId}` doc's `storagePath` — the authoritative,
 *      current upload-flow index.
 *   2. A generic recursive string scan of every Firestore collection's
 *      documents for any field value containing "/media/", extracting the
 *      raw storage path after it — catches legacy embedded URLs from before
 *      the mediaAssets short-ID system existed, without having to hand-list
 *      every collection/field name that might hold one.
 *
 * `tmp/**` objects are reported (count + age) but never flagged as orphans —
 * that prefix is already owned by the mediaTmpCleanup scheduled function.
 *
 * Usage: node appkit/scripts/firebase-storage-orphan-report.mjs [--out <path>] [--project <id>]
 * Always dry-run / report-only. There is no delete flag — that is a
 * deliberately separate, future piece of work requiring its own review.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = process.cwd();
const serviceAccountPath = resolve(repoRoot, "firebase-admin-key.json");

const envLocalPath = resolve(repoRoot, ".env.local");
if (existsSync(envLocalPath)) {
  const lines = readFileSync(envLocalPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const raw = trimmed.slice(eqIdx + 1).trim();
    const value = raw.replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function logStep(message) {
  console.log(`\n[storage-orphan-report] ${message}`);
}

const MEDIA_URL_RE = /\/media\/([^\s"')]+)/g;

/** Recursively walk any Firestore doc value, collecting storage paths found in embedded /media/<path> URLs. */
function collectMediaPathsFromValue(value, out) {
  if (value == null) return;
  if (typeof value === "string") {
    let match;
    MEDIA_URL_RE.lastIndex = 0;
    while ((match = MEDIA_URL_RE.exec(value))) {
      out.add(decodeURIComponent(match[1]));
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectMediaPathsFromValue(item, out);
    return;
  }
  if (typeof value === "object") {
    // Firestore Timestamp/GeoPoint/DocumentReference instances — skip, not string-bearing.
    if (typeof value.toDate === "function" || typeof value.isEqual === "function") return;
    for (const key of Object.keys(value)) collectMediaPathsFromValue(value[key], out);
  }
}

async function collectLiveStoragePaths(db) {
  const live = new Set();

  logStep("Pass 1/2: reading mediaAssets collection (authoritative index)...");
  const mediaAssetsSnap = await db.collection("mediaAssets").get();
  for (const doc of mediaAssetsSnap.docs) {
    const storagePath = doc.get("storagePath");
    if (typeof storagePath === "string" && storagePath) live.add(storagePath);
  }
  logStep(`mediaAssets: ${mediaAssetsSnap.size} docs, ${live.size} storagePath value(s) collected.`);

  logStep("Pass 2/2: scanning every collection for embedded /media/<path> URLs (legacy references)...");
  const rootCollections = await db.listCollections();
  let scannedDocs = 0;
  let legacyFound = 0;
  for (const collectionRef of rootCollections) {
    if (collectionRef.id === "mediaAssets") continue; // already covered by pass 1
    const snap = await collectionRef.get();
    for (const doc of snap.docs) {
      scannedDocs += 1;
      const before = live.size;
      collectMediaPathsFromValue(doc.data(), live);
      if (live.size > before) legacyFound += live.size - before;
    }
  }
  logStep(`Scanned ${scannedDocs} document(s) across ${rootCollections.length} collection(s); ${legacyFound} additional legacy path(s) found.`);

  return live;
}

async function listStorageObjects(bucket) {
  const tmpFiles = [];
  const mediaFiles = [];
  const otherFiles = [];
  let pageToken = undefined;

  do {
    const [files, nextQuery] = await bucket.getFiles({
      autoPaginate: false,
      maxResults: 1000,
      pageToken,
    });
    for (const file of files) {
      const name = file.name;
      if (name.startsWith("tmp/")) tmpFiles.push(file);
      else if (name.startsWith("media/")) mediaFiles.push(file);
      else otherFiles.push(file);
    }
    pageToken = nextQuery?.pageToken;
  } while (pageToken);

  return { tmpFiles, mediaFiles, otherFiles };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

async function main() {
  const outPath = parseArg("--out");
  const projectArg = parseArg("--project") || process.env.FIREBASE_PROJECT_ID || null;

  if (!existsSync(serviceAccountPath)) {
    throw new Error(`Missing service account file: ${serviceAccountPath}`);
  }

  const serviceAccount = require(serviceAccountPath);
  const projectId = projectArg || serviceAccount.project_id || null;
  if (!projectId) {
    throw new Error("Could not resolve Firebase project ID. Pass --project <id>.");
  }

  logStep(`Using Firebase project: ${projectId} (READ-ONLY — no deletions will occur)`);

  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId,
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      `${projectId}.firebasestorage.app`,
  });

  try {
    const db = admin.firestore(app);
    const bucket = admin.storage(app).bucket();

    const liveStoragePaths = await collectLiveStoragePaths(db);

    logStep(`Listing all objects in bucket: ${bucket.name}...`);
    const { tmpFiles, mediaFiles, otherFiles } = await listStorageObjects(bucket);
    logStep(`Found ${tmpFiles.length} tmp/** object(s), ${mediaFiles.length} media/** object(s), ${otherFiles.length} object(s) outside both prefixes.`);

    const now = Date.now();
    const tmpAges = tmpFiles.map((f) => {
      const updated = f.metadata?.updated ? new Date(f.metadata.updated).getTime() : now;
      return Math.floor((now - updated) / 3_600_000);
    });
    const staleTmpCount = tmpAges.filter((hours) => hours >= 24).length;

    const orphans = [];
    let orphanBytes = 0;
    for (const file of mediaFiles) {
      if (liveStoragePaths.has(file.name)) continue;
      const size = Number(file.metadata?.size ?? 0);
      orphanBytes += size;
      orphans.push({
        path: file.name,
        sizeBytes: size,
        contentType: file.metadata?.contentType ?? "unknown",
        updated: file.metadata?.updated ?? null,
      });
    }
    orphans.sort((a, b) => b.sizeBytes - a.sizeBytes);

    console.log("\n" + "=".repeat(72));
    console.log("Firebase Storage Orphan Report (READ-ONLY — nothing was deleted)");
    console.log("=".repeat(72));
    console.log(`Project:                    ${projectId}`);
    console.log(`Bucket:                     ${bucket.name}`);
    console.log(`Live storagePath references: ${liveStoragePaths.size}`);
    console.log(`tmp/** objects:             ${tmpFiles.length} (${staleTmpCount} older than 24h — normally cleaned by mediaTmpCleanup)`);
    console.log(`media/** objects:           ${mediaFiles.length}`);
    console.log(`Candidate orphans:          ${orphans.length} (${formatBytes(orphanBytes)} reclaimable)`);
    if (otherFiles.length > 0) {
      console.log(`Objects outside tmp/+media/: ${otherFiles.length} (not evaluated — unexpected prefix, review manually)`);
    }
    console.log("=".repeat(72));

    if (orphans.length > 0) {
      console.log("\nTop candidate orphans (largest first, showing up to 50):");
      for (const o of orphans.slice(0, 50)) {
        console.log(`  ${formatBytes(o.sizeBytes).padStart(10)}  ${o.contentType.padEnd(24)}  ${o.path}`);
      }
      if (orphans.length > 50) {
        console.log(`  ... and ${orphans.length - 50} more (see --out file for the full list).`);
      }
    } else {
      console.log("\nNo orphaned media/** objects found — every object is referenced by a live Firestore document.");
    }

    if (outPath) {
      const report = {
        generatedAt: new Date().toISOString(),
        projectId,
        bucket: bucket.name,
        liveStoragePathCount: liveStoragePaths.size,
        tmpObjectCount: tmpFiles.length,
        staleTmpObjectCount: staleTmpCount,
        mediaObjectCount: mediaFiles.length,
        otherObjectCount: otherFiles.length,
        orphanCount: orphans.length,
        orphanReclaimableBytes: orphanBytes,
        orphans,
      };
      writeFileSync(resolve(outPath), JSON.stringify(report, null, 2), "utf8");
      logStep(`Full report written to ${resolve(outPath)}`);
    }

    logStep("Report complete. No Storage or Firestore data was modified.");
  } finally {
    await app.delete();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`\n[storage-orphan-report] Failed:\n${message}`);
  process.exit(1);
});
