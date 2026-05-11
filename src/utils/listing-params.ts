/**
 * Standardised listing-API param reader (Q2 — S12).
 *
 * All public listing routes (/api/products, /api/pre-orders, /api/stores,
 * /api/auctions, and the per-store nested variants) accept short canonical
 * names:
 *
 *   f      — filters (Sieve filter string)
 *   s      — sort  (Sieve sort string, e.g. "-createdAt")
 *   p      — page  (1-based)
 *   ps     — pageSize
 *   q      — full-text search query
 *   cursor — opaque pagination cursor (S13 / listingProcessor)
 *
 * Old verbose names (`filters`, `sorts`/`sort`, `page`, `pageSize`, `q`,
 * `cursor`) remain accepted for backwards compatibility. When both forms are
 * present the SHORT form wins (clients should migrate to the short form).
 *
 * The reader does NOT enforce any defaults — callers pass their own (e.g.
 * default sort, page size) so this helper stays a pure URL → values map.
 */

export const LISTING_PARAM_NAMES = {
  /** Filters (Sieve-formatted): `field==value,otherField>=value` */
  filters: { short: "f", long: "filters" },
  /** Sort string: `-createdAt`, `price`, etc. */
  sorts: { short: "s", long: "sorts", legacy: "sort" },
  /** Page number, 1-based. */
  page: { short: "p", long: "page" },
  /** Page size. */
  pageSize: { short: "ps", long: "pageSize" },
  /** Full-text search query. */
  q: { short: "q", long: "q" },
  /** Opaque pagination cursor (S13). */
  cursor: { short: "cursor", long: "cursor" },
} as const;

export interface ListingParams {
  /** Sieve filter string, or null when neither short nor long form is set. */
  filters: string | null;
  /** Sort string (short `s` > long `sorts` > legacy `sort`). */
  sorts: string | null;
  /** Page number, or null when not set. Caller picks the default. */
  page: number | null;
  /** Page size, or null when not set. */
  pageSize: number | null;
  /** Full-text search query. */
  q: string | null;
  /** Opaque pagination cursor. */
  cursor: string | null;
}

function readShortFirst(
  url: URL,
  short: string,
  long: string,
  legacy?: string,
): string | null {
  return (
    url.searchParams.get(short) ??
    url.searchParams.get(long) ??
    (legacy ? url.searchParams.get(legacy) : null)
  );
}

function readNumber(value: string | null): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Same precedence as parseListingParams but reads from a Next.js
 * Server-Component `searchParams` object (`Record<string, string | string[]>`).
 * Convenience wrapper so SSR listing pages don't have to construct a URL.
 */
export function parseListingSearchParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): ListingParams {
  const sp = searchParams ?? {};
  function get(key: string): string | null {
    const v = sp[key];
    if (v == null) return null;
    return Array.isArray(v) ? v[0] ?? null : v;
  }
  function firstOf(...keys: (string | undefined)[]): string | null {
    for (const k of keys) {
      if (!k) continue;
      const v = get(k);
      if (v != null) return v;
    }
    return null;
  }
  return {
    filters: firstOf(
      LISTING_PARAM_NAMES.filters.short,
      LISTING_PARAM_NAMES.filters.long,
    ),
    sorts: firstOf(
      LISTING_PARAM_NAMES.sorts.short,
      LISTING_PARAM_NAMES.sorts.long,
      LISTING_PARAM_NAMES.sorts.legacy,
    ),
    page: readNumber(
      firstOf(LISTING_PARAM_NAMES.page.short, LISTING_PARAM_NAMES.page.long),
    ),
    pageSize: readNumber(
      firstOf(
        LISTING_PARAM_NAMES.pageSize.short,
        LISTING_PARAM_NAMES.pageSize.long,
      ),
    ),
    q: firstOf(LISTING_PARAM_NAMES.q.short, LISTING_PARAM_NAMES.q.long),
    cursor: firstOf(
      LISTING_PARAM_NAMES.cursor.short,
      LISTING_PARAM_NAMES.cursor.long,
    ),
  };
}

/**
 * Parse a URL into the standard listing params bag. Returns nulls for keys
 * absent in the URL — callers apply their own defaults.
 */
export function parseListingParams(url: URL): ListingParams {
  return {
    filters: readShortFirst(
      url,
      LISTING_PARAM_NAMES.filters.short,
      LISTING_PARAM_NAMES.filters.long,
    ),
    sorts: readShortFirst(
      url,
      LISTING_PARAM_NAMES.sorts.short,
      LISTING_PARAM_NAMES.sorts.long,
      LISTING_PARAM_NAMES.sorts.legacy,
    ),
    page: readNumber(
      readShortFirst(
        url,
        LISTING_PARAM_NAMES.page.short,
        LISTING_PARAM_NAMES.page.long,
      ),
    ),
    pageSize: readNumber(
      readShortFirst(
        url,
        LISTING_PARAM_NAMES.pageSize.short,
        LISTING_PARAM_NAMES.pageSize.long,
      ),
    ),
    q: readShortFirst(
      url,
      LISTING_PARAM_NAMES.q.short,
      LISTING_PARAM_NAMES.q.long,
    ),
    cursor: readShortFirst(
      url,
      LISTING_PARAM_NAMES.cursor.short,
      LISTING_PARAM_NAMES.cursor.long,
    ),
  };
}

/**
 * Build a query string using the short canonical names. Mirrors
 * `parseListingParams` so a round-trip through URL never loses precedence.
 *
 * Pass `undefined`/`null`/empty-string for any key you don't want serialised.
 */
export function serializeListingParams(
  params: Partial<ListingParams>,
  extra?: Record<string, string | number | undefined | null>,
): string {
  const usp = new URLSearchParams();
  if (params.filters) usp.set(LISTING_PARAM_NAMES.filters.short, params.filters);
  if (params.sorts) usp.set(LISTING_PARAM_NAMES.sorts.short, params.sorts);
  if (params.page != null)
    usp.set(LISTING_PARAM_NAMES.page.short, String(params.page));
  if (params.pageSize != null)
    usp.set(LISTING_PARAM_NAMES.pageSize.short, String(params.pageSize));
  if (params.q) usp.set(LISTING_PARAM_NAMES.q.short, params.q);
  if (params.cursor) usp.set(LISTING_PARAM_NAMES.cursor.short, params.cursor);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v == null || v === "") continue;
      usp.set(k, String(v));
    }
  }
  return usp.toString();
}
