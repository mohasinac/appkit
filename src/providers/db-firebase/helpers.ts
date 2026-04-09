/**
 * Firestore serialisation helpers.
 *
 * These utilities are the single adapter boundary between raw Firestore
 * documents and application-level objects.
 */

// ─── Undefined removal ────────────────────────────────────────────────────────

/**
 * Recursively remove `undefined` values from an object.
 * Firestore rejects writes that contain `undefined` fields.
 */
export function removeUndefined<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value === undefined) continue;

    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      !(
        value as { constructor?: { name?: string } }
      ).constructor?.name?.includes("Timestamp")
    ) {
      const cleaned = removeUndefined(value as Record<string, unknown>);
      if (Object.keys(cleaned).length > 0) {
        result[key] = cleaned;
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
export function prepareForFirestore<T extends Record<string, unknown>>(
  data: T,
): Partial<T> {
  return removeUndefined(data);
}

// ─── Timestamp deserialisation ────────────────────────────────────────────────

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
    typeof (obj as { toDate?: unknown }).toDate === "function"
  ) {
    return (obj as unknown as { toDate(): Date }).toDate() as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(deserializeTimestamps) as unknown as T;
  }

  if (typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as object).map(([k, v]) => [
        k,
        deserializeTimestamps(v),
      ]),
    ) as unknown as T;
  }

  return obj;
}
