import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import type { IFieldOps } from "../../contracts/field-ops";

/**
 * Firebase Admin SDK implementation of IFieldOps.
 * Registered automatically when the db-firebase provider is imported.
 */
export const firebaseFieldOps: IFieldOps = {
  serverTimestamp: () => FieldValue.serverTimestamp(),
  increment: (n: number) => FieldValue.increment(n),
  arrayUnion: (...elements: unknown[]) => FieldValue.arrayUnion(...elements),
  arrayRemove: (...elements: unknown[]) => FieldValue.arrayRemove(...elements),
  deleteField: () => FieldValue.delete(),
};
