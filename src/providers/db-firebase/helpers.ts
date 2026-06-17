import type {
  CollectionReference,
  DocumentData,
  Query,
} from "firebase-admin/firestore";
import type { FirestoreDocument, FirestoreValue, JsonValue } from "../../schemas/types";

/**
 * Firestore serialisation helpers.
 *
 * These utilities are the single adapter boundary between raw Firestore
 * documents and application-level objects.
 */

// --- Undefined removal --------------------------------------------------------

/**
 * Returns true only for plain objects ({}) — NOT class instances, Dates,
 * Arrays, FieldValue sentinels, or Timestamps. Only plain objects are safe
 * to recurse into; everything else must pass through unchanged so Firestore
 * FieldValue sentinels (increment, arrayUnion, deleteField, etc.) are not
 * stripped.
 */
// audit-unknown-ok: type-narrowing entry point — accepts any value, narrows by typeof/Array.isArray
function isPlainObject(v: unknown): v is Record<string, FirestoreValue> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  // audit-unknown-ok: TS structural escape
  const proto = Object.getPrototypeOf(v) as unknown;
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively remove `undefined` values from an object.
 * Firestore rejects writes that contain `undefined` fields.
 *
 * Non-plain values (Date, FieldValue sentinels, class instances, Arrays)
 * are passed through as-is so that Firestore transform operations
 * (increment, arrayUnion, deleteField, serverTimestamp) survive the strip.
 */
export function removeUndefined<T extends object>(
  obj: T,
): Partial<T> {
  const result: Record<string, FirestoreValue> = {};
  const source = obj as Record<string, FirestoreValue>;

  for (const key of Object.keys(source)) {
    const value = source[key];
    if (value === undefined) continue;

    if (isPlainObject(value)) {
      const cleaned = removeUndefined(value);
      if (Object.keys(cleaned).length > 0) {
        result[key] = cleaned as FirestoreValue;
      }
    } else {
      result[key] = value;
    }
  }

  return result as Partial<T>;
}

/**
 * Strip `undefined` values before any Firestore write.
 * Call this on every `create()` / `update()` payload.
 */
export function prepareForFirestore<T extends object>(
  data: T,
): Partial<T> {
  return removeUndefined(data);
}

// --- Timestamp deserialisation ------------------------------------------------

/**
 * Recursively convert Firestore `Timestamp` instances to plain `Date` objects.
 *
 * React Server Components cannot serialise Firestore `Timestamp` class instances
 * to Client Components.  `Date` objects are serialised as ISO strings.
 */
export function deserializeTimestamps<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  // Firestore Timestamp — has .toDate() but is not a plain Date
  if (
    typeof obj === "object" &&
    !(obj instanceof Date) &&
    typeof (obj as { toDate?: JsonValue }).toDate === "function"
  ) {
    // audit-unknown-ok: TS structural escape — generic param
    return (obj as unknown as { toDate(): Date }).toDate() as unknown as T;
  }

  if (Array.isArray(obj)) {
    // audit-unknown-ok: TS structural escape — generic param
    return obj.map(deserializeTimestamps) as unknown as T;
  }

  if (typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as object).map(([k, v]) => [
        k,
        deserializeTimestamps(v),
      ]),
    // audit-unknown-ok: TS structural escape — generic param
    ) as unknown as T;
  }

  return obj;
}

type CountCapableQuery = Query<DocumentData> & {
  count?: () => {
    get: () => Promise<{
      data: () => { count: number };
    }>;
  };
};

export async function getFirestoreCount(
  query: Query<DocumentData> | CollectionReference<DocumentData>,
): Promise<number> {
  const countQuery = query as CountCapableQuery;

  if (typeof countQuery.count === "function") {
    const snapshot = await countQuery.count().get();
    return snapshot.data().count;
  }

  const snapshot = await query.get();
  return snapshot.size;
}
