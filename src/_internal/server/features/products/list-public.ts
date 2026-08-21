/*
 * WHY: One implementation of "list products for a public listing page", shared by
 *      every SSR listing view AND `/api/products`. Before 2026-08-21 there were five
 *      hand-rolled copies of this filter logic (four SSR views + the route) and they
 *      had drifted: the route had learned — via `6fe4e0dd8` and `efb7d1b6a` — that an
 *      `inStock` (`stockQuantity>0`) or mismatched date-range inequality must NEVER be
 *      pushed into the Firestore query, while the SSR views still pushed it and
 *      swallowed the resulting FAILED_PRECONDITION as "no results". That is what made
 *      /art render empty until "Show sold" was clicked.
 *
 * WHAT: `parsePublicProductParams` (URL/searchParams -> typed input) and
 *       `listPublicProducts` (typed input -> page of documents). Firestore-safe
 *       clauses go into the query; `inStock` and unsafe date ranges are applied as
 *       in-memory predicates over one bounded fetch, then re-sorted into the caller's
 *       requested order and re-paginated.
 *
 * EXPORTS:
 *   PublicProductListInput, PublicProductListResult, PublicProductExecutor,
 *   PublicProductListOptions, parsePublicProductParams, listPublicProducts
 *
 * @tag domain:products
 * @tag layer:server-data
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:ProductsIndexPageView,ArtStickersListView,AuctionsListView,PreOrdersListView,api/products
 * @tag sideEffects:firestore-read
 */

import { productRepository } from "../../../../repositories";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring/server-logger";
import { PRODUCT_FIELDS } from "../../../../constants/field-names";
import { TABLE_KEYS } from "../../../../constants/table-keys";
import type { JsonValue } from "../../../../schemas/types";
import { sortBy } from "../../../../constants/sort";
import {
  SIEVE_OP,
  sieveAnd,
  sieveFilter,
  expandSieveParam,
} from "../../../../utils/sieve-builder";
import { ALL_LISTING_TYPES } from "../../../shared/listing-types/feature-flags";
import { hideDefaultsFor } from "../../../shared/listing-types/_registry";
import type { ListingType } from "../../../../features/products/types/index";

/** Vercel Hobby Fluid Compute ceiling (CLAUDE.md Rule #6) — never fetch more at once. */
export const PUBLIC_PRODUCT_MAX_PAGE_SIZE = 50;

/**
 * Which "Show X" defaults apply to a set of listing types.
 *
 * THE POINT OF THIS FUNCTION is that SSR and the client refetch call the SAME
 * implementation. `staleTime: Infinity` freezes SSR `initialData` forever, so
 * if the SSR filter-builder computes a different default than the client's
 * bare-URL state, the first paint and every later refetch disagree and one of
 * them is wrong — permanently (Root Cause #30). Two mirrored literals is
 * exactly how that bug is written; one shared function is how it isn't.
 *
 * `/products` now spans all nine listing types, which makes this load-bearing
 * rather than theoretical: a mixed set includes both sold-out-able types
 * (products, art) and time-boxed ones (auctions, pre-orders, prize draws), so
 * BOTH toggles can apply at once.
 */
export function defaultTogglesForListingTypes(types: readonly string[] | undefined): {
  hideSoldByDefault: boolean;
  hideEndedByDefault: boolean;
} {
  // No explicit set = every type is in play, so both defaults apply.
  const effective = types && types.length > 0 ? types : ALL_LISTING_TYPES;
  const defaults = hideDefaultsFor(
    effective.filter((t): t is ListingType => ALL_LISTING_TYPES.includes(t as ListingType)),
  );
  return {
    hideSoldByDefault: defaults.includes("sold"),
    // "ended" and "closed" are the same query mechanic (a date range against
    // the type's own end field); they differ only in the toggle's wording.
    hideEndedByDefault: defaults.includes("ended") || defaults.includes("closed"),
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 24;
const DEFAULT_SORTS = sortBy(PRODUCT_FIELDS.CREATED_AT);

/**
 * A product document as it comes back from either executor. Deliberately
 * `JsonValue`-shaped rather than `ProductDocument`: the upstream listingProcessor
 * Function returns already-serialised rows, and this module only ever reads a
 * handful of scalar fields off them (stockQuantity, listingType, the sort key).
 */
type Row = Record<string, JsonValue>;

export interface PublicProductListInput {
  /**
   * Listing types this page spans. Emitted as one pipe-joined OR-group, which
   * the Firebase Sieve adapter upgrades to a `.where(…, "in", …)` query.
   */
  listingTypes?: readonly string[];
  q?: string;
  category?: string;
  brand?: string;
  /** Pipe-joined multi-select (`new|used`) — emitted as an OR-group, never as AND. */
  condition?: string;
  storeId?: string;
  status?: string;
  minPrice?: string;
  maxPrice?: string;
  minBid?: string;
  maxBid?: string;
  featured?: boolean;
  isPromoted?: boolean;
  freeShipping?: boolean;
  isPartOfBundle?: boolean;
  features?: readonly string[];
  /** Pipe-joined multi-select over the `tags` array field. */
  tags?: readonly string[];
  /** Pipe-joined multi-select over `sublistingCategoryId`. */
  sublistingCategoryIds?: readonly string[];
  /**
   * Per-listing-type facets (classified meetup city, digital-code delivery
   * method, live-item species, …), keyed by TABLE_KEY. Resolved to their
   * nested Firestore paths via `TYPE_FACET_FIELD`.
   */
  typeFacets?: Record<string, string>;
  preOrderProductionStatus?: string;
  prizeRevealStatus?: string;
  /** Hide sold-out rows. Applied in memory — never pushed into Firestore. */
  inStock?: boolean;
  dateFrom?: string;
  dateTo?: string;
  /** Pre-validated raw Sieve string (callers must safelist fields themselves). */
  rawFilters?: string | null;
  page?: number;
  pageSize?: number;
  sorts?: string;
  cursor?: string | null;
}

export interface PublicProductListResult {
  items: Row[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  cursor: string | null;
  /** The Sieve string actually sent to Firestore — surfaced for debugging. */
  filters: string;
  sorts: string;
}

export interface PublicProductQuery {
  filters: string;
  sorts: string;
  page: number;
  pageSize: number;
  cursor?: string | null;
}

export interface ExecutorResult {
  items: unknown[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
  cursor?: string | null;
}

/**
 * How the query actually runs. Defaults to `productRepository.list`. The consumer
 * route overrides this to prefer the colocated `listingProcessor` Function and fall
 * back to the repository — the seam exists so that preference never has to be
 * duplicated into appkit, which has no access to the consumer's env.
 */
export type PublicProductExecutor = (
  query: PublicProductQuery,
) => Promise<ExecutorResult>;

export interface PublicProductListOptions {
  executor?: PublicProductExecutor;
  /**
   * When supplied, rows whose `listingType` is not in this set are stripped after
   * the fetch. Callers that can read siteSettings pass `enabledListingTypes(...)`.
   */
  enabledListingTypes?: ReadonlySet<string>;
}

// ---------------------------------------------------------------------------
// Param parsing
// ---------------------------------------------------------------------------

function first(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string,
): string {
  if (params instanceof URLSearchParams) return params.get(key) ?? "";
  const v = params[key];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function num(raw: string): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Per-type facet URL key → the Firestore field path it filters.
 *
 * Every target is already allowlisted in the products repository's
 * SIEVE_FIELDS — the nested `classified.*` / `digitalCode.*` / `liveItem.*`
 * entries have been there since those types shipped. What was missing was any
 * code path that actually emitted a clause for them: the store listings
 * declared these keys in their FILTER_KEYS (so they counted toward the
 * filter badge) and rendered the controls, but never put them on the wire.
 */
const TYPE_FACET_FIELD: Record<string, string> = {
  [TABLE_KEYS.CITY]: "classified.meetupArea.city",
  [TABLE_KEYS.NEGOTIABLE]: "classified.negotiable",
  [TABLE_KEYS.ACCEPTS_SHIPPING]: "classified.acceptsShipping",
  [TABLE_KEYS.DELIVERY_METHOD]: "digitalCode.codeDeliveryMethod",
  [TABLE_KEYS.SPECIES]: "liveItem.species",
  [TABLE_KEYS.LIVE_SEX]: "liveItem.sex",
  [TABLE_KEYS.JURISDICTION]: "liveItem.jurisdictionAllowed",
};

/** Read every known per-type facet present in the params. */
function readTypeFacets(
  get: (key: string) => string,
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const key of Object.keys(TYPE_FACET_FIELD)) {
    const value = get(key);
    if (value) out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Split a pipe-joined multi-select value; `undefined` when empty. */
function pipeList(raw: string): string[] | undefined {
  const parts = raw.split("|").map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

/**
 * Read the shared public-listing query params. SSR views hand in Next's
 * `searchParams` record; the API route hands in `url.searchParams`. Both produce
 * the same typed input, which is the whole point — the two paths cannot drift.
 */
export function parsePublicProductParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
  defaults?: {
    listingTypes?: readonly string[];
    pageSize?: number;
    sorts?: string;
    /**
     * Public browse pages hide sold-out rows until the user flips "Show sold".
     * The API route leaves this off so non-browse callers (related items,
     * homepage sections) keep their current behaviour.
     */
    hideSoldByDefault?: boolean;
    /**
     * Auctions / pre-orders hide already-ended rows until "Show ended" is on,
     * by defaulting `dateFrom` to now. Must mirror the paired client listing
     * component exactly or the SSR paint and the refetch disagree.
     */
    hideEndedByDefault?: boolean;
  },
): PublicProductListInput {
  const get = (k: string) => first(params, k);

  // The type filter is a multi-select checkbox group, so its URL value is a
  // pipe-joined set (`auction|pre-order`). Selected types NARROW the page's
  // span; anything outside the span is discarded rather than allowed to widen
  // it (an /art URL must not be able to ask for auctions). Nothing selected —
  // or nothing valid selected — means the page's full span.
  const typeParam = get(TABLE_KEYS.LISTING_TYPE);
  const span = defaults?.listingTypes;
  const selected = typeParam
    .split("|")
    .map((t) => t.trim())
    .filter((t) => t && t !== "All");
  const narrowed = span ? selected.filter((t) => span.includes(t)) : selected;
  const listingTypes = narrowed.length > 0 ? narrowed : span;

  const featuresRaw = get(TABLE_KEYS.FEATURES);

  return {
    listingTypes,
    q: get(TABLE_KEYS.QUERY) || undefined,
    category: get(TABLE_KEYS.CATEGORY) || get(TABLE_KEYS.CATEGORY_SLUG) || undefined,
    brand: get(TABLE_KEYS.BRAND) || undefined,
    condition: get(TABLE_KEYS.CONDITION) || undefined,
    storeId: get(TABLE_KEYS.STORE_ID) || get(TABLE_KEYS.SELLER) || undefined,
    status: get(TABLE_KEYS.STATUS) || undefined,
    minPrice: get(TABLE_KEYS.MIN_PRICE) || undefined,
    maxPrice: get(TABLE_KEYS.MAX_PRICE) || undefined,
    minBid: get(TABLE_KEYS.MIN_BID) || undefined,
    maxBid: get(TABLE_KEYS.MAX_BID) || undefined,
    featured: get(TABLE_KEYS.FEATURED) === "true" || undefined,
    isPromoted: get("isPromoted") === "true" || undefined,
    freeShipping: get(TABLE_KEYS.FREE_SHIPPING) === "true" || undefined,
    isPartOfBundle: get(TABLE_KEYS.IS_PART_OF_BUNDLE) === "true" || undefined,
    features: featuresRaw ? featuresRaw.split("|").filter(Boolean) : undefined,
    // Tags and Sublisting Type were rendered by <ProductFilters> for all three
    // variants and counted toward the active-filter badge, but were never
    // parsed here — so ticking one inflated the badge and changed nothing.
    tags: pipeList(get(TABLE_KEYS.TAGS)),
    sublistingCategoryIds: pipeList(get(TABLE_KEYS.SUBLISTING_CATEGORY)),
    typeFacets: readTypeFacets(get),
    preOrderProductionStatus:
      get(TABLE_KEYS.PREORDER_STATUS) || get("preOrderStatus") || undefined,
    prizeRevealStatus: get(TABLE_KEYS.PRIZE_REVEAL_STATUS) || undefined,
    // Three spellings of one intent — /products and /art call it "Show sold",
    // /pre-orders calls it "Show closed", and the client hook sends `inStock`.
    // Any of them turning the filter OFF wins, so SSR and the client refetch
    // agree on what the default view means (Root Cause #30).
    inStock:
      get(TABLE_KEYS.SHOW_SOLD) === "true" || get(TABLE_KEYS.SHOW_CLOSED) === "true"
        ? undefined
        : get(TABLE_KEYS.IN_STOCK)
          ? get(TABLE_KEYS.IN_STOCK) === "true"
          : defaults?.hideSoldByDefault
            ? true
            : undefined,
    dateFrom:
      get(TABLE_KEYS.DATE_FROM) ||
      (defaults?.hideEndedByDefault && get(TABLE_KEYS.SHOW_ENDED) !== "true"
        ? new Date().toISOString()
        : undefined),
    dateTo: get(TABLE_KEYS.DATE_TO) || undefined,
    page: num(get(TABLE_KEYS.PAGE)) ?? DEFAULT_PAGE,
    pageSize: num(get(TABLE_KEYS.PAGE_SIZE)) ?? defaults?.pageSize ?? DEFAULT_PAGE_SIZE,
    sorts: get(TABLE_KEYS.SORT) || defaults?.sorts || DEFAULT_SORTS,
  };
}

// ---------------------------------------------------------------------------
// Filter building
// ---------------------------------------------------------------------------

/**
 * Only clauses Firestore can satisfy alongside an arbitrary `orderBy`. Notably
 * ABSENT: `inStock` (a `stockQuantity` range) and, unless the sort matches, the
 * auction/pre-order date ranges. Firestore appends an inequality field to the
 * orderBy implicitly, so pairing one with an unrelated sort demands a composite
 * index in an order nobody declares — it fails with FAILED_PRECONDITION, which
 * upstream reads as a bare "no results".
 */
function buildFirestoreSafeFilters(input: PublicProductListInput): string {
  const parts: string[] = [];

  // Published-only unless the caller explicitly asks otherwise. Without this
  // default, any refetch that omits `status` leaks drafts (Root Cause #30).
  parts.push(
    sieveFilter(
      PRODUCT_FIELDS.STATUS,
      SIEVE_OP.EQ,
      input.status || PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    ),
  );

  const types = input.listingTypes?.filter(Boolean) ?? [];
  if (types.length > 0) {
    parts.push(sieveFilter(PRODUCT_FIELDS.LISTING_TYPE, SIEVE_OP.EQ, types.join("|")));
  }

  if (input.category) {
    parts.push(
      expandSieveParam(PRODUCT_FIELDS.CATEGORY_SLUGS, input.category, SIEVE_OP.CONTAINS),
    );
  }
  if (input.brand) parts.push(sieveFilter(PRODUCT_FIELDS.BRAND, SIEVE_OP.EQ, input.brand));
  if (input.condition) {
    // Pipe-joined OR-group, NOT `sieveMultiEq` — that emits
    // `condition==new,condition==used`, an AND of two equalities on one field,
    // which can never match a document.
    const values = input.condition.split("|").filter(Boolean);
    if (values.length > 0) {
      parts.push(sieveFilter(PRODUCT_FIELDS.CONDITION, SIEVE_OP.EQ, values.join("|")));
    }
  }
  if (input.storeId) parts.push(sieveFilter(PRODUCT_FIELDS.STORE_ID, SIEVE_OP.EQ, input.storeId));

  const minPrice = num(input.minPrice ?? "");
  if (minPrice !== undefined) parts.push(sieveFilter(PRODUCT_FIELDS.PRICE, SIEVE_OP.GTE, minPrice));
  const maxPrice = num(input.maxPrice ?? "");
  if (maxPrice !== undefined) parts.push(sieveFilter(PRODUCT_FIELDS.PRICE, SIEVE_OP.LTE, maxPrice));

  const minBid = num(input.minBid ?? "");
  if (minBid !== undefined) parts.push(sieveFilter(PRODUCT_FIELDS.CURRENT_BID, SIEVE_OP.GTE, minBid));
  const maxBid = num(input.maxBid ?? "");
  if (maxBid !== undefined) parts.push(sieveFilter(PRODUCT_FIELDS.CURRENT_BID, SIEVE_OP.LTE, maxBid));

  if (input.featured) parts.push(sieveFilter(PRODUCT_FIELDS.FEATURED, SIEVE_OP.EQ, true));
  if (input.isPromoted) parts.push(sieveFilter(PRODUCT_FIELDS.IS_PROMOTED, SIEVE_OP.EQ, true));
  if (input.freeShipping) {
    parts.push(
      sieveFilter(
        PRODUCT_FIELDS.SHIPPING_PAID_BY,
        SIEVE_OP.EQ,
        PRODUCT_FIELDS.SHIPPING_PAID_BY_VALUES.SELLER,
      ),
    );
  }
  if (input.isPartOfBundle) parts.push(sieveFilter("isPartOfBundle", SIEVE_OP.EQ, true));

  if (input.preOrderProductionStatus) {
    parts.push(
      sieveFilter(
        PRODUCT_FIELDS.PRE_ORDER_PRODUCTION_STATUS,
        SIEVE_OP.EQ,
        input.preOrderProductionStatus,
      ),
    );
  }
  if (input.prizeRevealStatus) {
    parts.push(
      sieveFilter(PRODUCT_FIELDS.PRIZE_REVEAL_STATUS, SIEVE_OP.EQ, input.prizeRevealStatus),
    );
  }

  if (input.q) parts.push(sieveFilter(PRODUCT_FIELDS.TITLE, SIEVE_OP.CONTAINS_CI, input.q));
  // `array-contains-any` isn't supported by the Sieve Firebase adapter, so only a
  // single feature can be pushed down; multi-select falls through to the caller.
  if (input.features?.length === 1) {
    parts.push(sieveFilter(PRODUCT_FIELDS.FEATURES, SIEVE_OP.CONTAINS, input.features[0]));
  }
  // `tags` is an array field, so the same one-value limit applies.
  if (input.tags?.length === 1) {
    parts.push(sieveFilter(PRODUCT_FIELDS.TAGS, SIEVE_OP.CONTAINS, input.tags[0]));
  }
  // A scalar field, so several values ARE expressible as an OR-group (which
  // the Firebase adapter upgrades to `in`).
  if (input.sublistingCategoryIds?.length) {
    parts.push(
      sieveFilter(
        PRODUCT_FIELDS.SUBLISTING_CATEGORY_ID,
        SIEVE_OP.EQ,
        input.sublistingCategoryIds.join("|"),
      ),
    );
  }

  // Per-type facets. Unknown keys can't reach here — `readTypeFacets` only
  // reads the ones in TYPE_FACET_FIELD, so an arbitrary query param can never
  // be turned into a Firestore field path.
  for (const [key, raw] of Object.entries(input.typeFacets ?? {})) {
    const field = TYPE_FACET_FIELD[key];
    if (!field || !raw) continue;
    // `jurisdictionAllowed` is an array field — array-contains, not equality.
    const op = field.endsWith("jurisdictionAllowed") ? SIEVE_OP.CONTAINS : SIEVE_OP.EQ;
    const values = raw.split("|").filter(Boolean);
    if (values.length === 0) continue;
    parts.push(
      op === SIEVE_OP.CONTAINS
        ? sieveFilter(field, op, values[0])
        : sieveFilter(field, op, values.join("|")),
    );
  }

  if (input.rawFilters) parts.push(input.rawFilters);

  return sieveAnd(...parts.filter(Boolean));
}

/** Which Timestamp field a date range refers to, given the requested listing types. */
function dateFieldFor(types: readonly string[] | undefined): string | null {
  if (!types || types.length !== 1) return null;
  if (types[0] === PRODUCT_FIELDS.LISTING_TYPE_VALUES.AUCTION) {
    return PRODUCT_FIELDS.AUCTION_END_DATE;
  }
  if (types[0] === PRODUCT_FIELDS.LISTING_TYPE_VALUES.PRE_ORDER) {
    return PRODUCT_FIELDS.PRE_ORDER_DELIVERY_DATE;
  }
  return null;
}

async function defaultExecutor(query: PublicProductQuery): Promise<ExecutorResult> {
  const result = await productRepository.list({
    filters: query.filters,
    sorts: query.sorts,
    page: query.page,
    pageSize: query.pageSize,
  });
  return {
    items: result.items,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    hasMore: result.hasMore,
    cursor: null,
  };
}

// ---------------------------------------------------------------------------
// The one public listing query
// ---------------------------------------------------------------------------

export async function listPublicProducts(
  input: PublicProductListInput,
  opts?: PublicProductListOptions,
): Promise<PublicProductListResult | null> {
  const page = Math.max(1, input.page ?? DEFAULT_PAGE);
  const pageSize = Math.min(
    PUBLIC_PRODUCT_MAX_PAGE_SIZE,
    Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE),
  );
  const sorts = input.sorts || DEFAULT_SORTS;
  const requestedSortField = sorts.replace(/^-/, "");

  const dateField = dateFieldFor(input.listingTypes);
  const hasDateRange = Boolean((input.dateFrom || input.dateTo) && dateField);
  // Firestore DOES accept one inequality when the query sorts by that same field —
  // the auctions "Ending Soon" default is exactly that shape, so push it down.
  const canPushDate =
    hasDateRange && !input.inStock && requestedSortField === dateField;

  const safeFilters = buildFirestoreSafeFilters(input);
  const filters = sieveAnd(
    safeFilters,
    ...(canPushDate && input.dateFrom
      ? [sieveFilter(dateField as string, SIEVE_OP.GTE, input.dateFrom)]
      : []),
    ...(canPushDate && input.dateTo
      ? [sieveFilter(dateField as string, SIEVE_OP.LTE, input.dateTo)]
      : []),
  );

  const hasUnsafeFilter = Boolean(input.inStock) || (hasDateRange && !canPushDate);

  // When a date range stays in memory, fetch in whichever direction front-loads
  // the rows that will PASS it: `dateFrom` (">=", still live) wants the most
  // future dates first; `dateTo` ("<=", ends by) wants the earliest first.
  // Fetching in the client's own order instead is what made live auctions
  // invisible once ~50 had already ended.
  const fetchSorts =
    hasUnsafeFilter && hasDateRange && dateField
      ? input.dateFrom
        ? sortBy(dateField, "DESC")
        : sortBy(dateField, "ASC")
      : sorts;

  const executor = opts?.executor ?? defaultExecutor;

  let result: ExecutorResult;
  try {
    result = await executor({
      filters,
      sorts: fetchSorts,
      page: hasUnsafeFilter ? 1 : page,
      pageSize: hasUnsafeFilter ? PUBLIC_PRODUCT_MAX_PAGE_SIZE : pageSize,
      cursor: hasUnsafeFilter ? null : (input.cursor ?? null),
    });
  } catch (error) {
    void normalizeError(error);
    // Loud. A swallowed query failure here is indistinguishable from an empty
    // catalogue at every call site above, which is exactly how the /art bug hid.
    serverLogger.error("listPublicProducts query failed", {
      filters,
      sorts: fetchSorts,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  let items = result.items as Row[];
  let total = result.total;
  let totalPages = result.totalPages;
  let resultPage = result.page;
  let hasMore = result.hasMore;
  let cursor = result.cursor ?? null;

  if (hasUnsafeFilter) {
    const filtered = items.filter((item) => {
      if (input.inStock) {
        const stock = item[PRODUCT_FIELDS.STOCK_QUANTITY];
        if (!(typeof stock === "number" && stock > 0)) return false;
      }
      if (hasDateRange && dateField) {
        const raw = item[dateField];
        if (!raw) return false;
        const value = raw instanceof Date ? raw.toISOString() : String(raw);
        if (input.dateFrom && value < input.dateFrom) return false;
        if (input.dateTo && value > input.dateTo) return false;
      }
      return true;
    });

    const ordered =
      fetchSorts === sorts ? filtered : sortRows(filtered, requestedSortField, sorts.startsWith("-"));

    total = ordered.length;
    totalPages = Math.max(1, Math.ceil(total / pageSize));
    resultPage = page;
    const start = (page - 1) * pageSize;
    items = ordered.slice(start, start + pageSize);
    hasMore = start + pageSize < total;
    cursor = null;
  }

  // Feature-flagged-off types never reach a public surface.
  const enabled = opts?.enabledListingTypes;
  if (enabled && enabled.size > 0) {
    const before = items.length;
    items = items.filter((it) => {
      const lt = typeof it.listingType === "string" ? it.listingType : "standard";
      return enabled.has(lt);
    });
    const removed = before - items.length;
    if (removed > 0) total = Math.max(0, total - removed);
  }

  return {
    items,
    total,
    page: resultPage,
    pageSize,
    totalPages,
    hasMore,
    cursor,
    filters,
    sorts,
  };
}

/**
 * One store tab's worth of listings.
 *
 * Every `Store*PageView` used to hand-roll this: `productRepository.list()`
 * with an inline `sieveAnd(...)` and a `.catch(() => null)`. That is the exact
 * shape that made `/art` render empty — an unsafe inequality (or any missing
 * index) becomes FAILED_PRECONDITION, the catch turns it into `null`, and the
 * page shows "no results" with nothing logged. Eight views carried it, and
 * `audit-listing-filter-parity` had none of them registered.
 *
 * Routing them through `listPublicProducts` also gives every store tab
 * something it never had: the URL's own sort/filter/page params reach the SSR
 * fetch, so the first paint matches what the toolbar says is selected.
 */
export async function listStoreProducts(
  storeId: string,
  listingTypes: readonly string[],
  searchParams: URLSearchParams | Record<string, string | string[] | undefined> = {},
  defaults?: { pageSize?: number; sorts?: string },
): Promise<PublicProductListResult | null> {
  return listPublicProducts({
    ...parsePublicProductParams(searchParams, {
      listingTypes,
      pageSize: defaults?.pageSize ?? DEFAULT_PAGE_SIZE,
      sorts: defaults?.sorts,
      ...defaultTogglesForListingTypes(listingTypes),
    }),
    // The route owns the store identity — a `?storeId=` in the URL must not be
    // able to make one store's tab render another store's inventory.
    storeId,
  });
}

function sortRows(rows: Row[], field: string, desc: boolean): Row[] {
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av) < String(bv)
          ? -1
          : String(av) > String(bv)
            ? 1
            : 0;
    return desc ? -cmp : cmp;
  });
}
