import "server-only";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import * as path from "path";
import * as fs from "fs";

function parsePrivateKey(raw: string): string {
  return raw
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
}

declare global {
  // eslint-disable-next-line no-var
  var __mohasinac_firebase_admin_app_lite__: App | null | undefined;
}

export function getAdminAppLite(): App {
  if (globalThis.__mohasinac_firebase_admin_app_lite__) {
    return globalThis.__mohasinac_firebase_admin_app_lite__;
  }

  if (getApps().length) {
    const existing = getApps()[0];
    globalThis.__mohasinac_firebase_admin_app_lite__ = existing;
    return existing;
  }

  const keyPath = path.join(process.cwd(), "firebase-admin-key.json");
  let app: App;

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
      "@mohasinac/db-firebase: Firebase Admin credentials not found.",
    );
  }

  globalThis.__mohasinac_firebase_admin_app_lite__ = app;
  return app;
}
