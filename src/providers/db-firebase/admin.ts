/**
 * Firebase Admin SDK singletons.
 *
 * Supports two init methods (checked in order):
 *   1. `firebase-admin-key.json` in process.cwd() — development
 *   2. FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY env vars — production
 *
 * All getters are lazy — the SDK is not touched until first use.
 */
import "server-only";

import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { Storage } from "firebase-admin/storage";
import type { Database } from "firebase-admin/database";
import * as path from "path";
import * as fs from "fs";

// Lazy loaders — prevents webpack from bundling firebase-admin into browser chunks.
// (module as any).require() is used because webpack's static analysis does NOT trace
// module.require() calls, unlike calls to the literal `require` or aliased `require`.
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
function loadApp() {
  return (module as any).require(
    "firebase-admin/app",
  ) as typeof import("firebase-admin/app");
}
function loadAuth() {
  return (module as any).require(
    "firebase-admin/auth",
  ) as typeof import("firebase-admin/auth");
}
function loadFirestore() {
  return (module as any).require(
    "firebase-admin/firestore",
  ) as typeof import("firebase-admin/firestore");
}
function loadStorage() {
  return (module as any).require(
    "firebase-admin/storage",
  ) as typeof import("firebase-admin/storage");
}
function loadDatabase() {
  return (module as any).require(
    "firebase-admin/database",
  ) as typeof import("firebase-admin/database");
}
/* eslint-enable @typescript-eslint/no-require-imports */

// ─── Private key normalisation ────────────────────────────────────────────────
//
// Vercel (and other platforms) can store the private key in several formats:
//   1. Literal \n sequences  (common — copied from JSON value)
//   2. Real newlines          (set via CLI / multiline input)
//   3. Windows \r\n endings   (copied on Windows)
//   4. Wrapped in double-quotes (pasted with JSON quotes intact)
//
// OpenSSL 3 (Node 18+) rejects malformed PEM — ensure the key is normalised
// before passing it to `cert()`.
//
function parsePrivateKey(raw: string): string {
  return raw
    .replace(/^["']|["']$/g, "") // strip optional surrounding quotes
    .replace(/\\n/g, "\n") // literal \n → real newline
    .replace(/\r\n/g, "\n") // Windows CRLF → LF
    .trim();
}

// ─── Global singletons ────────────────────────────────────────────────────────
// Stored on globalThis so all module instances (package-manager deduplication may create
// multiple copies of this package in the same process) share one SDK instance.

declare global {
  // eslint-disable-next-line no-var
  var __mohasinac_firebase_admin_app__: App | null | undefined;
  // eslint-disable-next-line no-var
  var __mohasinac_firebase_admin_auth__: Auth | null | undefined;
  // eslint-disable-next-line no-var
  var __mohasinac_firebase_admin_db__: Firestore | null | undefined;
  // eslint-disable-next-line no-var
  var __mohasinac_firebase_admin_storage__: Storage | null | undefined;
  // eslint-disable-next-line no-var
  var __mohasinac_firebase_admin_rtdb__: Database | null | undefined;
}

function get<T>(key: keyof typeof globalThis): T | null {
  return (globalThis[key] as T | null | undefined) ?? null;
}
function set<T>(key: keyof typeof globalThis, value: T): void {
  (globalThis as Record<string, unknown>)[key] = value;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export function getAdminApp(): App {
  const cached = get<App>("__mohasinac_firebase_admin_app__");
  if (cached) return cached;

  const { initializeApp, getApps, cert } = loadApp();

  if (getApps().length) {
    const existing = getApps()[0];
    set("__mohasinac_firebase_admin_app__", existing);
    return existing;
  }

  const keyPath = path.join(process.cwd(), "firebase-admin-key.json");
  let app: App;

  try {
    if (fs.existsSync(keyPath)) {
      const sa = JSON.parse(fs.readFileSync(keyPath, "utf8"));
      const dbUrl =
        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
        `https://${sa.project_id}-default-rtdb.firebaseio.com`;

      app = initializeApp({ credential: cert(keyPath), databaseURL: dbUrl });
    } else if (
      process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ) {
      const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID.trim();
      const dbUrl =
        process.env.FIREBASE_ADMIN_DATABASE_URL?.trim() ??
        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.trim() ??
        `https://${projectId}-default-rtdb.firebaseio.com`;

      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL.trim(),
          privateKey: parsePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
        }),
        databaseURL: dbUrl,
      });
    } else {
      throw new Error(
        "@mohasinac/db-firebase: Firebase Admin credentials not found.\n" +
          "Add firebase-admin-key.json to project root, or set " +
          "FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, " +
          "FIREBASE_ADMIN_PRIVATE_KEY environment variables.",
      );
    }
  } catch (err) {
    console.error(
      "[@mohasinac/db-firebase] Failed to initialise Admin SDK:",
      err,
    );
    throw err;
  }

  set("__mohasinac_firebase_admin_app__", app);
  return app;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function getAdminAuth(): Auth {
  const cached = get<Auth>("__mohasinac_firebase_admin_auth__");
  if (cached) return cached;
  const { getAuth } = loadAuth();
  const auth = getAuth(getAdminApp());
  set("__mohasinac_firebase_admin_auth__", auth);
  return auth;
}

// ─── Firestore ────────────────────────────────────────────────────────────────

export function getAdminDb(): Firestore {
  const cached = get<Firestore>("__mohasinac_firebase_admin_db__");
  if (cached) return cached;
  const { getFirestore } = loadFirestore();
  const db = getFirestore(getAdminApp());
  try {
    // settings() can only be called once per Firestore instance — guard for
    // HMR reloads and duplicate module instances.
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Already configured — safe to ignore.
  }
  set("__mohasinac_firebase_admin_db__", db);
  return db;
}

// ─── Cloud Storage ────────────────────────────────────────────────────────────

export function getAdminStorage(): Storage {
  const cached = get<Storage>("__mohasinac_firebase_admin_storage__");
  if (cached) return cached;
  const { getStorage: getFirebaseStorage } = loadStorage();
  const storage = getFirebaseStorage(getAdminApp());
  set("__mohasinac_firebase_admin_storage__", storage);
  return storage;
}

// ─── Realtime DB ──────────────────────────────────────────────────────────────

export function getAdminRealtimeDb(): Database {
  const cached = get<Database>("__mohasinac_firebase_admin_rtdb__");
  if (cached) return cached;
  const { getDatabase } = loadDatabase();
  const rtdb = getDatabase(getAdminApp());
  set("__mohasinac_firebase_admin_rtdb__", rtdb);
  return rtdb;
}

/** Reset all singletons — useful in tests. */
export function _resetAdminSingletons(): void {
  set("__mohasinac_firebase_admin_app__", null);
  set("__mohasinac_firebase_admin_auth__", null);
  set("__mohasinac_firebase_admin_db__", null);
  set("__mohasinac_firebase_admin_storage__", null);
  set("__mohasinac_firebase_admin_rtdb__", null);
}
