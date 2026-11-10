#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// repoRoot is the consumer project (where the script is run from)
const repoRoot = process.cwd();
const serviceAccountPath = resolve(repoRoot, "firebase-admin-key.json");
const resetConfigPath = resolve(
  __dirname,
  "../firebase/reset/firebase.reset.json",
);

// Load .env.local so NEXT_PUBLIC_FIREBASE_* vars are available without shell exports.
// Uses a minimal built-in parser to avoid a dotenv dependency.
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
    // Strip surrounding quotes if present.
    const value = raw.replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function logStep(message) {
  console.log(`\n[firebase:reset] ${message}`);
}

function runFirebaseCommand(args, projectId) {
  const fullArgs = ["firebase-tools", ...args];
  if (projectId) {
    fullArgs.push("--project", projectId);
  }

  const result = spawnSync("npx", fullArgs, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: true,
  });

  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(`firebase-tools command failed: npx ${fullArgs.join(" ")}`);
  }
}

function runFirebaseCommandCapture(args, projectId) {
  const fullArgs = ["firebase-tools", ...args];
  if (projectId) {
    fullArgs.push("--project", projectId);
  }

  const result = spawnSync("npx", fullArgs, {
    cwd: repoRoot,
    stdio: "pipe",
    shell: true,
    encoding: "utf8",
  });

  if (typeof result.status === "number" && result.status !== 0) {
    const stderr = result.stderr || "";
    throw new Error(
      `firebase-tools command failed: npx ${fullArgs.join(" ")}\n${stderr}`,
    );
  }

  return result.stdout || "";
}

function parseFunctionIds(functionsListOutput) {
  const ids = new Set();

  try {
    const parsed = JSON.parse(functionsListOutput);
    const functions = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.result)
        ? parsed.result
        : [];

    for (const fn of functions) {
      if (fn && typeof fn.id === "string" && fn.id.trim()) {
        ids.add(fn.id.trim());
      }
    }
  } catch {
    const idRegex = /"id"\s*:\s*"([^"]+)"/g;
    let match = idRegex.exec(functionsListOutput);
    while (match) {
      if (match[1]?.trim()) ids.add(match[1].trim());
      match = idRegex.exec(functionsListOutput);
    }
  }

  return Array.from(ids);
}

function deleteAllCloudFunctions(projectId) {
  const listOutput = runFirebaseCommandCapture(
    ["functions:list", "--json"],
    projectId,
  );
  const functionIds = parseFunctionIds(listOutput);

  if (functionIds.length === 0) {
    logStep("No deployed Cloud Functions found.");
    return;
  }

  logStep(`Deleting ${functionIds.length} deployed Cloud Functions...`);
  runFirebaseCommand(
    ["functions:delete", "--force", ...functionIds],
    projectId,
  );
}

function isMissingBucketError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("specified bucket does not exist") ||
    message.includes("No such bucket")
  );
}

async function deleteAllFirestore(db) {
  const rootCollections = await db.listCollections();
  if (rootCollections.length === 0) {
    logStep("Firestore is already empty.");
    return;
  }

  for (const collectionRef of rootCollections) {
    logStep(`Deleting Firestore collection: ${collectionRef.id}`);
    await db.recursiveDelete(collectionRef);
  }
}

async function deleteAllAuthUsers(auth) {
  let nextPageToken = undefined;
  let totalDeleted = 0;

  do {
    const page = await auth.listUsers(1000, nextPageToken);
    const uids = page.users.map((user) => user.uid);

    if (uids.length > 0) {
      const response = await auth.deleteUsers(uids);
      totalDeleted += response.successCount;
      if (response.failureCount > 0) {
        console.warn(
          `[firebase:reset] Failed to delete ${response.failureCount} auth users in a batch.`,
        );
      }
    }

    nextPageToken = page.pageToken;
  } while (nextPageToken);

  logStep(`Deleted auth users: ${totalDeleted}`);
}

async function deleteAllStorageFiles(storage) {
  const bucket = storage.bucket();
  try {
    await bucket.deleteFiles({ force: true });
    logStep(`Deleted all objects from storage bucket: ${bucket.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isMissingBucketError(error)) {
      logStep(
        `Storage bucket not found (${bucket.name}); skipping storage deletion.`,
      );
      return;
    }
    if (message.includes("No such object") || message.includes("Not Found")) {
      logStep("Storage bucket is already empty.");
      return;
    }
    throw error;
  }
}

async function summarizeFirestore(db) {
  const rootCollections = await db.listCollections();
  if (rootCollections.length === 0) {
    return { rootCollectionCount: 0, rootDocumentCount: 0, collections: [] };
  }

  let rootDocumentCount = 0;
  const collections = [];

  for (const collectionRef of rootCollections) {
    const snapshot = await collectionRef.get();
    const count = snapshot.size;
    rootDocumentCount += count;
    collections.push({ id: collectionRef.id, count });
  }

  return {
    rootCollectionCount: rootCollections.length,
    rootDocumentCount,
    collections,
  };
}

async function summarizeAuth(auth) {
  let nextPageToken = undefined;
  let totalUsers = 0;

  do {
    const page = await auth.listUsers(1000, nextPageToken);
    totalUsers += page.users.length;
    nextPageToken = page.pageToken;
  } while (nextPageToken);

  return totalUsers;
}

async function summarizeStorage(storage) {
  const bucket = storage.bucket();
  let pageToken = undefined;
  let totalFiles = 0;

  try {
    do {
      const [files, nextQuery] = await bucket.getFiles({
        autoPaginate: false,
        maxResults: 1000,
        pageToken,
      });

      totalFiles += files.length;
      pageToken = nextQuery?.pageToken;
    } while (pageToken);
  } catch (error) {
    if (isMissingBucketError(error)) {
      return {
        bucket: bucket.name,
        totalFiles: 0,
        missing: true,
      };
    }
    throw error;
  }

  return {
    bucket: bucket.name,
    totalFiles,
    missing: false,
  };
}

async function summarizeRtdb(rtdb) {
  const snapshot = await rtdb.ref("/").get();
  if (!snapshot.exists()) {
    return { hasData: false, topLevelKeys: 0 };
  }

  const value = snapshot.val();
  const topLevelKeys =
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.keys(value).length
      : 1;

  return { hasData: true, topLevelKeys };
}

async function previewDeletionPlan({ db, rtdb, auth, storage, projectId, databaseId }) {
  logStep("Dry-run mode enabled: no destructive operations will run.");
  logStep(`Target project: ${projectId}`);
  /*
   * 🛑 The dry run MUST name the same database the real run will hit.
   * A preview that silently previews a different target than `--yes` deletes
   * is worse than no preview: it manufactures confidence. Both lines are
   * derived from the same resolved `databaseId`.
   */
  logStep(
    `Target database: ${databaseId ?? "(default)"}${databaseId ? "" : "  ← THIS IS PRODUCTION"}`,
  );

  const firestoreSummary = await summarizeFirestore(db);
  const authSummary = await summarizeAuth(auth);
  const storageSummary = await summarizeStorage(storage);
  const rtdbSummary = await summarizeRtdb(rtdb);

  console.log("\n[firebase:reset] Planned deletion summary");
  console.log(
    `- Firestore root collections: ${firestoreSummary.rootCollectionCount}`,
  );
  console.log(
    `- Firestore root-level documents: ${firestoreSummary.rootDocumentCount}`,
  );
  if (firestoreSummary.collections.length > 0) {
    console.log("- Firestore collections:");
    for (const collection of firestoreSummary.collections) {
      console.log(`  - ${collection.id}: ${collection.count}`);
    }
  }
  console.log(`- RTDB has data: ${rtdbSummary.hasData}`);
  console.log(`- RTDB top-level keys: ${rtdbSummary.topLevelKeys}`);
  console.log(`- Auth users: ${authSummary}`);
  console.log(`- Storage bucket: ${storageSummary.bucket}`);
  if (storageSummary.missing) {
    console.log("- Storage files: skipped (bucket does not exist)");
  } else {
    console.log(`- Storage files: ${storageSummary.totalFiles}`);
  }
  console.log("- Cloud Functions: all deployed functions would be deleted");
  console.log(
    "- Rules/indexes: reset rules + empty firestore indexes would be deployed",
  );
  console.log("\n[firebase:reset] End of dry-run. No data was changed.");
}

async function wipeAllDataResources({ db, rtdb, auth, storage, projectId }) {
  logStep("Phase 1/2: Wiping project data resources...");

  logStep("Deleting all Firestore documents...");
  await deleteAllFirestore(db);

  logStep("Deleting all RTDB data at '/'.");
  await rtdb.ref("/").remove();

  logStep("Deleting all Firebase Authentication users...");
  await deleteAllAuthUsers(auth);

  logStep("Deleting all Cloud Storage files...");
  await deleteAllStorageFiles(storage);

  logStep("Deleting all deployed Cloud Functions...");
  try {
    deleteAllCloudFunctions(projectId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[firebase:reset] Warning: Cloud Functions deletion failed, continuing with rules/index reset.\n${message}`,
    );
  }

  logStep("Phase 1/2 complete: all data resources deleted.");
}

function resetRulesAndIndexes(projectId) {
  logStep("Phase 2/2: Resetting rules and indexes...");
  runFirebaseCommand(
    [
      "deploy",
      "--force",
      "--only",
      "firestore:rules,storage,database,firestore:indexes",
      "--config",
      resetConfigPath,
    ],
    projectId,
  );
  logStep("Phase 2/2 complete: reset rules and indexes deployed.");
}

async function main() {
  const accepted = hasFlag("--yes") || hasFlag("--force");
  const isDryRun = hasFlag("--dry-run");
  const projectArg =
    parseArg("--project") || process.env.FIREBASE_PROJECT_ID || null;

  if (!accepted && !isDryRun) {
    console.error(
      "This script is destructive and will delete Firestore, RTDB, Storage, Auth users, and Cloud Functions.",
    );
    console.error(
      "It will also deploy reset-deny rules and empty Firestore indexes.",
    );
    console.error(
      "Re-run with --yes to continue, or use --dry-run for a non-destructive preview.",
    );
    process.exit(1);
  }

  /*
   * 🛑 TWO credential sources, and the key FILE is no longer mandatory.
   *
   * This script used to hard-require `firebase-admin-key.json` at the repo
   * root while `seed-cli` — the tool everyone actually runs — authenticates
   * from `FIREBASE_ADMIN_*` in `.env.local`. So the two halves of the same
   * workflow needed two different credential setups, and the reset simply
   * could not run on a machine that was otherwise fully configured.
   *
   * Order: the key file wins when present (it also carries `project_id`,
   * which is why it is still preferred), then the env vars.
   *
   * ⚠ The file requirement was arguably deliberate friction on a script that
   * deletes every document. Removing it makes an accidental run easier, so the
   * other guards matter more now, not less: `--yes` is still required, the
   * resolved DATABASE is printed before anything is deleted, and `(default)`
   * is labelled as production in both the dry run and the real run.
   */
  const parsePrivateKey = (raw) => {
    if (!raw) return raw;
    return raw.includes(String.fromCharCode(92, 110))
      ? raw.split(String.fromCharCode(92, 110)).join(String.fromCharCode(10))
      : raw;
  };

  let serviceAccount = null;
  let credential;
  if (existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
    credential = admin.credential.cert(serviceAccount);
    logStep(`Credentials: ${serviceAccountPath}`);
  } else if (
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID.trim(),
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL.trim(),
      privateKey: parsePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
    });
    logStep("Credentials: FIREBASE_ADMIN_* from the environment (.env.local)");
  } else {
    throw new Error(
      `No credentials. Provide ${serviceAccountPath}, or set ` +
        "FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / " +
        "FIREBASE_ADMIN_PRIVATE_KEY (the same vars seed-cli reads).",
    );
  }

  const projectId =
    projectArg ||
    serviceAccount?.project_id ||
    process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
    null;

  if (!projectId) {
    throw new Error(
      "Could not resolve Firebase project ID. Pass --project <id>.",
    );
  }

  logStep(`Using Firebase project: ${projectId}`);

  const app = admin.initializeApp({
    credential,
    projectId,
    databaseURL:
      process.env.FIREBASE_DATABASE_URL ||
      `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`,
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      `${projectId}.firebasestorage.app`,
  });

  try {
    /*
     * 🛑 WHICH DATABASE. This was `admin.firestore(app)` with no id, which
     * ALWAYS resolves to `(default)` — i.e. PRODUCTION — and silently ignored
     * `FIREBASE_SHOP_DATABASE_ID` entirely.
     *
     * That is a loaded gun on a script whose whole job is deleting every
     * document: a developer with `FIREBASE_SHOP_DATABASE_ID=dev-db` in
     * `.env.local` (which is the documented local setup) would reasonably
     * expect `--yes` to clear dev-db, and it would wipe production instead,
     * completely and with no restore path.
     *
     * Resolution order, most explicit first:
     *   1. `--database <id>`   said out loud on the command line
     *   2. FIREBASE_SHOP_DATABASE_ID   the same var the app and seed-cli read,
     *                                  so this script can no longer disagree
     *                                  with them about which database it is on
     *   3. `(default)`         only when neither is set
     *
     * 🛑 The resolved name is PRINTED before anything is deleted, and the
     * dry-run prints it too. "Which database did that just hit?" must be
     * answerable from the output, not inferred from the environment.
     */
    const databaseArg = parseArg("--database");
    /*
     * 🛑 `--database default` is how you ASK FOR PRODUCTION, explicitly.
     *
     * Without it there is no way to reach `(default)` on a machine whose
     * `.env.local` sets FIREBASE_SHOP_DATABASE_ID=dev-db — which is the
     * documented local setup, so that is every machine. The env fallback is a
     * good safe default; it must not become a cage that makes the production
     * path reachable only by unsetting a variable inline, because that is the
     * kind of incantation people get wrong in a shell at 2am.
     *
     * Spelling it `default` rather than an empty string keeps it visible in
     * shell history and in a screenshot of the command.
     */
    const databaseId =
      databaseArg === "default"
        ? null
        : databaseArg || process.env.FIREBASE_SHOP_DATABASE_ID || null;
    /*
     * 🛑 `getFirestore(app, id)`, NEVER `admin.firestore(app, id)`.
 *
     * The positional form SILENTLY IGNORES the database id and returns
     * `(default)` — which is PRODUCTION. It does not throw and it does not warn,
     * so the script goes on printing the database it believes it is using while
     * reading and writing the live one.
 *
     * Measured 2026-11-10, same credentials, same collection:
     *   admin.firestore()                -> users: 20
     *   admin.firestore(app, "dev-db")   -> users: 20   <- production
     *   getFirestore(app, "dev-db")      -> users: 0    <- the real dev-db
 *
     * It had already caused damage: a `--collections users` load intended for
     * dev-db wrote 20 user documents into production, on a database the owner
     * specified must hold the admin account alone.
 *
     * `providers/db-firebase/admin.ts` has always used the modular form, which is
     * why the APPS target the right database and only the scripts drifted.
     */
    const { getFirestore: _getFirestore } = require("firebase-admin/firestore");
    const db = databaseId ? _getFirestore(app, databaseId) : _getFirestore(app);
    logStep(
      `Firestore target: ${databaseId ?? "(default)"}${databaseId ? "" : "  ← THIS IS PRODUCTION"}`,
    );
    const rtdb = admin.database(app);
    const auth = admin.auth(app);
    const storage = admin.storage(app);

    if (isDryRun) {
      await previewDeletionPlan({ db, rtdb, auth, storage, projectId, databaseId });
      return;
    }

    await wipeAllDataResources({ db, rtdb, auth, storage, projectId });
    resetRulesAndIndexes(projectId);

    logStep("Firebase reset completed successfully.");
  } finally {
    await app.delete();
  }
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.stack || error.message : String(error);
  console.error(`\n[firebase:reset] Failed:\n${message}`);
  process.exit(1);
});
