// Auto-register Firebase field operations on import
import { registerFieldOps } from "../../contracts/field-ops";
import { firebaseFieldOps } from "./field-ops";
registerFieldOps(firebaseFieldOps);

/**
 * @mohasinac/db-firebase
 *
 * Firebase Firestore + Realtime DB implementation of the repository contracts.
 *
 * @example
 * ```ts
 * import { FirebaseRepository } from "@mohasinac/db-firebase";
 * import type { Product } from "@/types";
 *
 * export class ProductRepository extends FirebaseRepository<Product> {
 *   constructor() { super("products"); }
 * }
 * ```
 */

// Admin SDK singletons
export {
  getAdminApp,
  getAdminAuth,
  getAdminDb,
  getAdminStorage,
  getAdminRealtimeDb,
  _resetAdminSingletons,
} from "./admin";

// Serialisation helpers
export {
  removeUndefined,
  prepareForFirestore,
  deserializeTimestamps,
  getFirestoreCount,
} from "./helpers";

// Firebase field ops implementation
export { firebaseFieldOps } from "./field-ops";

// Re-export DocumentSnapshot type for mapDoc overrides in feature repos
export type { DocumentSnapshot } from "firebase-admin/firestore";

// Repository base classes
export { FirebaseRepository } from "./base";
export { BaseRepository } from "./base.repository";
export { FirebaseSieveRepository } from "./sieve";
export { FirebaseRealtimeRepository } from "./realtime";

// Re-export RTDB paths
export { RTDB_PATHS } from "./rtdb-paths";

// IDbProvider implementation — registers Firebase as the database backend.
// Wire once in providers.config.ts: db: firebaseDbProvider
import type { IDbProvider, IRepository } from "../../contracts";
import type { DocumentData } from "firebase-admin/firestore";
import { FirebaseRepository as _FirebaseRepository } from "./base";

export const firebaseDbProvider: IDbProvider = {
  getRepository<T>(collection: string): IRepository<T> {
    return new _FirebaseRepository<T & DocumentData>(
      collection,
    ) as unknown as IRepository<T>;
  },
};

// Firebase client config builder (for consumer app bundles)
export {
  buildFirebaseClientConfig,
  normalizeFirebaseConfigValue,
} from "./client-config";
export type { FirebaseClientConfig } from "./client-config";
export type {
  SieveModel,
  SieveFields,
  SieveFieldConfig,
  SieveOptions,
  SieveResult,
  FirebaseSieveFieldConfig,
  FirebaseSieveFields,
  FirebaseSieveOptions,
  FirebaseSieveResult,
} from "./sieve";
export { applySieveToFirestore } from "./sieve";
