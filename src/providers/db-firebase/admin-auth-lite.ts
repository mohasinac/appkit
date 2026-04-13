import { getAuth, type Auth } from "firebase-admin/auth";
import { getAdminAppLite } from "./admin-app-lite";

declare global {
  // eslint-disable-next-line no-var
  var __mohasinac_firebase_admin_auth_lite__: Auth | null | undefined;
}

export function getAdminAuthLite(): Auth {
  if (globalThis.__mohasinac_firebase_admin_auth_lite__) {
    return globalThis.__mohasinac_firebase_admin_auth_lite__;
  }
  const auth = getAuth(getAdminAppLite());
  globalThis.__mohasinac_firebase_admin_auth_lite__ = auth;
  return auth;
}
