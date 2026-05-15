import { initializeApp, getApps, cert, type App } from "firebase-admin/app";

/* eslint-disable @typescript-eslint/no-require-imports */
function nodePath() { return require("path") as typeof import("path"); }
function nodeFs()   { return require("fs")   as typeof import("fs"); }
// process.cwd() is Node.js-only; access via module.require so the Edge
// static analyser does not flag this file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function nodeCwd(): string { return (module as any).require("process").cwd(); }
/* eslint-enable @typescript-eslint/no-require-imports */

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

  const keyPath = nodePath().join(nodeCwd(), "firebase-admin-key.json");
  const storageBucket =
    process.env.FIREBASE_ADMIN_STORAGE_BUCKET?.trim() ??
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  let app: App;

  if (nodeFs().existsSync(keyPath)) {
    const sa = JSON.parse(nodeFs().readFileSync(keyPath, "utf8"));
    const dbUrl =
      process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
      `https://${sa.project_id}-default-rtdb.firebaseio.com`;

    app = initializeApp({ credential: cert(keyPath), databaseURL: dbUrl, ...(storageBucket && { storageBucket }) });
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
      ...(storageBucket && { storageBucket }),
    });
  } else if (
    // Application Default Credentials path — used by Firebase Functions /
    // Cloud Run / GCE / GKE. The runtime sets `FUNCTION_TARGET` (gen 2
    // Functions) or `K_SERVICE` (Cloud Run); FIREBASE_CONFIG carries the
    // project info Firebase auto-injects. When any of those is present, defer
    // to ADC by calling `initializeApp()` with no credential — the SDK pulls
    // creds from the GCE metadata server.
    process.env.FUNCTION_TARGET ||
    process.env.K_SERVICE ||
    process.env.FIREBASE_CONFIG ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  ) {
    const firebaseConfig = process.env.FIREBASE_CONFIG
      ? (JSON.parse(process.env.FIREBASE_CONFIG) as {
          projectId?: string;
          databaseURL?: string;
        })
      : {};
    const projectId =
      firebaseConfig.projectId ?? process.env.GCLOUD_PROJECT ?? "";
    const dbUrl =
      firebaseConfig.databaseURL ??
      process.env.FIREBASE_ADMIN_DATABASE_URL ??
      process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
      (projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : undefined);

    app = initializeApp({
      ...(dbUrl && { databaseURL: dbUrl }),
      ...(storageBucket && { storageBucket }),
    });
  } else {
    throw new Error(
      "@mohasinac/db-firebase: Firebase Admin credentials not found.",
    );
  }

  globalThis.__mohasinac_firebase_admin_app_lite__ = app;
  return app;
}
