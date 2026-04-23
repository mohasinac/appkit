/**
 * Route-param filter state — parser and serializer
 *
 * Canonical URL pattern:
 *   /listing/[segment-key]/[segment-value]/[segment-key]/[segment-value]/...
 *
 * Example:
 *   /products/category/collectibles/sort/price-asc/page/2
 *   → { category: "collectibles", sort: "price-asc", page: "2" }
 *
 * Special handling:
 *   - Unknown trailing segments are ignored during parse.
 *   - `page` defaults to "1" when absent.
 *   - `sort` defaults to "relevance" when absent.
 *   - Segments are always lowercase-URL-safe values.
 */

export type RouteFilterState = Record<string, string>;

/**
 * Parse flat path segments (key/value pairs) into a filter state map.
 *
 * @example
 *   parseRouteFilterSegments(["category", "collectibles", "sort", "price-asc", "page", "2"])
 *   // → { category: "collectibles", sort: "price-asc", page: "2" }
 */
export function parseRouteFilterSegments(
  segments: string[],
): RouteFilterState {
  const state: RouteFilterState = {};
  for (let i = 0; i < segments.length - 1; i += 2) {
    const key = segments[i];
    const value = segments[i + 1];
    if (key && value !== undefined) {
      state[key] = value;
    }
  }
  return state;
}

/**
 * Serialize a filter state map back into flat path segments for use in a URL.
 *
 * Keys are emitted in the provided `keyOrder` first, then any remaining keys
 * alphabetically. Keys with empty / undefined values are omitted.
 *
 * @example
 *   serializeRouteFilterSegments({ category: "collectibles", sort: "price-asc", page: "2" })
 *   // → "category/collectibles/sort/price-asc/page/2"
 */
export function serializeRouteFilterSegments(
  state: RouteFilterState,
  keyOrder: string[] = ["category", "sort", "page"],
): string {
  const orderedKeys = [
    ...keyOrder.filter((k) => k in state),
    ...Object.keys(state)
      .filter((k) => !keyOrder.includes(k))
      .sort(),
  ];

  return orderedKeys
    .filter((k) => state[k] !== undefined && state[k] !== "")
    .map((k) => `${encodeURIComponent(k)}/${encodeURIComponent(state[k])}`)
    .join("/");
}

/**
 * Build a full listing URL by combining the base path with serialized filter
 * state segments.
 *
 * @example
 *   buildFilterUrl("/products", { category: "collectibles", sort: "price-asc", page: "2" })
 *   // → "/products/category/collectibles/sort/price-asc/page/2"
 */
export function buildFilterUrl(
  basePath: string,
  state: RouteFilterState,
  keyOrder?: string[],
): string {
  const segments = serializeRouteFilterSegments(state, keyOrder);
  if (!segments) return basePath;
  return `${basePath.replace(/\/$/, "")}/${segments}`;
}

/**
 * Extract filter state from a Next.js catch-all `params.segments` array or
 * an already-split string path after the base route.
 *
 * Handles both string[] (Next.js catch-all) and string (split by "/").
 */
export function extractFilterStateFromParams(
  segments: string | string[] | undefined,
): RouteFilterState {
  if (!segments) return {};
  const parts = Array.isArray(segments)
    ? segments
    : segments.split("/").filter(Boolean);
  return parseRouteFilterSegments(parts);
}

/**
 * Merge a partial filter update into the current state, resetting `page` to
 * "1" when any filter key other than `page` changes (prevents stale
 * pagination).
 */
export function mergeFilterUpdate(
  current: RouteFilterState,
  update: RouteFilterState,
): RouteFilterState {
  const next = { ...current, ...update };
  const changed = Object.keys(update).some(
    (k) => k !== "page" && update[k] !== current[k],
  );
  if (changed && !("page" in update)) {
    next.page = "1";
  }
  return next;
}
