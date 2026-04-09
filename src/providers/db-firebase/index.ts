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
} from "./admin.js";

// Serialisation helpers
export {
  removeUndefined,
  prepareForFirestore,
  deserializeTimestamps,
} from "./helpers.js";

// Repository base classes
export { FirebaseRepository } from "./base.js";
export { FirebaseSieveRepository } from "./sieve.js";
export { FirebaseRealtimeRepository } from "./realtime.js";

// IDbProvider implementation — registers Firebase as the database backend.
// Wire once in providers.config.ts: db: firebaseDbProvider
import { FirebaseRepository } from "./base.js";
import type { IDbProvider, IRepository } from "@mohasinac/contracts";
import type { DocumentData } from "firebase-admin/firestore";

export const firebaseDbProvider: IDbProvider = {
  getRepository<T>(collection: string): IRepository<T> {
    return new FirebaseRepository<T & DocumentData>(
      collection,
    ) as unknown as IRepository<T>;
  },
};

// Types re-exported for consumers
export type {
  SieveModel,
  SieveFields,
  SieveFieldConfig,
  SieveOptions,
  SieveResult,
} from "./sieve.js";
