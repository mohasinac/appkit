import { FieldValue } from "firebase-admin/firestore";
import type { IFieldOps } from "../../contracts/field-ops";

/**
 * Firebase Admin SDK implementation of IFieldOps.
 * Registered automatically when the db-firebase provider is imported.
 */
export const firebaseFieldOps: IFieldOps = {
  serverTimestamp: () => FieldValue.serverTimestamp(),
  increment: (n: number) => FieldValue.increment(n),
  // audit-unknown-ok: Firestore field operations SDK boundary
  arrayUnion: (...elements: unknown[]) => FieldValue.arrayUnion(...elements),
  // audit-unknown-ok: Firestore field operations SDK boundary
  arrayRemove: (...elements: unknown[]) => FieldValue.arrayRemove(...elements),
  deleteField: () => FieldValue.delete(),
};
