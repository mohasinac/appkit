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
} from "./helpers";

// Repository base classes
export { FirebaseRepository } from "./base";
export { FirebaseSieveRepository } from "./sieve";
export { FirebaseRealtimeRepository } from "./realtime";

// IDbProvider implementation — registers Firebase as the database backend.
// Wire once in providers.config.ts: db: firebaseDbProvider
import { FirebaseRepository } from "./base";
import type { IDbProvider, IRepository } from "../../contracts";
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
} from "./sieve";
