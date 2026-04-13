import {
  getStorage as getFirebaseStorage,
  type Storage,
} from "firebase-admin/storage";
import { getAdminAppLite } from "./admin-app-lite";

declare global {
  // eslint-disable-next-line no-var
  var __mohasinac_firebase_admin_storage_lite__: Storage | null | undefined;
}

export function getAdminStorageLite(): Storage {
  if (globalThis.__mohasinac_firebase_admin_storage_lite__) {
    return globalThis.__mohasinac_firebase_admin_storage_lite__;
  }
  const storage = getFirebaseStorage(getAdminAppLite());
  globalThis.__mohasinac_firebase_admin_storage_lite__ = storage;
  return storage;
}
