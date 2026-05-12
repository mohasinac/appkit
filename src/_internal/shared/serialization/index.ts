/**
 * Hydration helpers — narrow the gap between Firestore document shapes
 * (which contain Timestamps, server FieldValues, undefined fields, etc.)
 * and serializable JSON suitable for crossing the RSC boundary.
 *
 * Usage:
 *   const product = await getProductForDetail(slug);
 *   return <ProductView initialProduct={toClient(product)} />;
 */

/** Recursive transform: any non-serializable value becomes a plain JSON value. */
export function toClient<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;

  // Firestore Timestamp duck-type — `.toDate()` returns a JS Date.
  const maybeTs = value as { toDate?: () => Date };
  if (typeof maybeTs.toDate === "function") {
    return maybeTs.toDate().toISOString() as unknown as T;
  }

  if (value instanceof Date) {
    return value.toISOString() as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((v) => toClient(v)) as unknown as T;
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[k] = toClient(v);
  }
  return out as unknown as T;
}

/**
 * Typed wrapper for passing an SSR-fetched value to a client component as
 * `initialX` props. Mostly cosmetic — it documents intent and ensures the
 * input went through `toClient()`.
 */
export function clientInitial<T>(value: T): T {
  return toClient(value);
}
