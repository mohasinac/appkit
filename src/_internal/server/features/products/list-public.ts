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
 *       clauses go into the query; the availability scope and unsafe date
 *       ranges are applied over bounded fetches, then re-sorted into the
 *       caller's requested order and re-paginated. See the comment block above
 *       `listPublicProducts` for why the three scopes execute differently.
 *
 *       Since 2026-08-24 this also backs the admin/seller dashboards, via the
 *       `ANY_STATUS` sentinel — so a dashboard and a public page filtering the
 *       same listing type issue byte-identical queries instead of two
 *       hand-rolled filter builders that drift.
 *
 * EXPORTS:
 *   PublicProductListInput, PublicProductListResult, PublicProductExecutor,
 *   PublicProductListOptions, parsePublicProductParams, listPublicProducts,
 *   listStoreProducts, defaultAvailabilityForListingTypes, ANY_STATUS,
 *   PUBLIC_PRODUCT_MAX_PAGE_SIZE
 *
 * @tag domain:products
 * @tag layer:server-data
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:ProductsIndexPageView,ArtStickersListView,AuctionsListView,PreOrdersListView,api/products
 * @tag sideEffects:firestore-read
 */

import { productRepository } from "../../../../repositories";
import { filterTestDataForViewer, type ViewerLike } from "../tester/visibility";
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
import {
  isListingRowAvailable,
  unavailableClausesFor,
} from "../../../shared/listing-types/_registry";
import type { UnavailableClause } from "../../../shared/listing-types/availability";
import {
  AVAILABILITY_VALUES,
  isAvailabilityFilter,
  type AvailabilityFilter,
} from "../../../../constants/field-names";
import type { ListingType } from "../../../../features/products/types/index";

/** Vercel Hobby Fluid Compute ceiling (CLAUDE.md Rule #6) — never fetch more at once. */
export const PUBLIC_PRODUCT_MAX_PAGE_SIZE = 50;

/**
 * `status` sentinel meaning "every publication state". Only the authenticated
 * admin/seller dashboards may pass it — a public surface that did would leak
 * drafts. A sentinel rather than `status: undefined` because undefined already
 * means "use the safe default", and conflating the two is how a leak ships.
 */
export const ANY_STATUS = "__any__";

/**
 * The availability scope a listing surface starts in.
 *
 * THE POINT OF THIS FUNCTION is that SSR and the client refetch call the SAME
 * implementation. `staleTime: Infinity` freezes SSR `initialData` forever, so
 * if the SSR filter-builder computes a different default than the client's
 * bare-URL state, the first paint and every later refetch disagree and one of
 * them is wrong — permanently (Root Cause #30). Two mirrored literals is
 * exactly how that bug is written; one shared function is how it isn't.
 *
 * It is a constant today rather than a per-type decision — every listing
 * surface opens on what a shopper can actually buy. It stays a function
 * because that is the seam a surface would override through, and because
 * `audit-listing-filter-parity` asserts on this name to prove every SSR view
 * derives its default rather than hard-coding one (two of them used to).
 */
export function defaultAvailabilityForListingTypes(
  _types?: readonly string[],
): { availability: AvailabilityFilter } {
  return { availability: AVAILABILITY_VALUES.AVAILABLE };
}

/** Narrow arbitrary strings to real listing types, dropping the rest. */
function asListingTypes(types: readonly string[] | undefined): ListingType[] {
  const effective = types && types.length > 0 ? types : ALL_LISTING_TYPES;
  return effective.filter((t): t is ListingType =>
    ALL_LISTING_TYPES.includes(t as ListingType),
  );
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
  /**
   * Publication status. Defaults to `published`. Pass `ANY_STATUS` for the
   * admin/seller dashboards, which exist precisely to show drafts, in-review
   * and archived rows — that is what lets them share this implementation
   * instead of hand-rolling a fourth filter builder.
   */
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
  /**
   * Which availability scope to return. Defaults to `all` so non-browse
   * callers (related items, search, homepage helpers that opt in explicitly)
   * are unaffected. Browse surfaces pass `available`.
   */
  availability?: AvailabilityFilter;
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
  /**
   * A bounded fetch saturated its ceiling, so `total` is a FLOOR, not a count.
   * Callers must render it as "50+", never as an exact figure, and must not
   * compute a final page number from it. Before this existed, the in-memory
   * path reported the size of its own 50-row window as the size of the result
   * set — a claim that is simply false past the ceiling.
   */
  truncated: boolean;
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
  /**
   * Free-text search, carried OUTSIDE `filters` on purpose.
   *
   * `searchTxt` matching is `array-contains`, which Sieve cannot express — so
   * it travels as an opt to `productRepository.list` (and as `baseOpts.search`
   * to the listingProcessor Function, whose products lister forwards opts
   * wholesale). Every executor must pass it on; dropping it is silent, because
   * a query with no search term is still a perfectly valid query that returns
   * rows.
   */
  search?: string;
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
  /**
   * The instant "now" refers to. Defaults to the wall clock; injectable so a
   * fan-out's several queries all resolve `"NOW"` to the SAME timestamp, and
   * so tests can pin it.
   */
  now?: Date;
  /**
   * Who is asking, for tester-sandbox visibility.
   *
   * 🛑 Omitting it means ANONYMOUS, and anonymous never sees `isTestData` rows.
   * Deliberately fail-closed: an undefined viewer is the default a caller gets
   * by forgetting, and forgetting must not publish the sandbox.
   *
   * On 2026-08-31 the public `/api/products` returned **25 tester fixtures in
   * its first 40 rows** to an unauthenticated caller — `stickers-tester-sandbox-1`,
   * `prizedraw-tester-sandbox-closed`, `live-tester-sandbox-1` — because this
   * function had no viewer concept at all. CLAUDE.md had already recorded that
   * `filterTestDataForViewer` was wired into the STORE read paths only, and that
   * the other listing routes "need the identical one-line treatment when touched
   * next". This is that treatment, applied at the one shared implementation
   * rather than at each of its callers.
   */
  viewer?: ViewerLike | null;
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
/*
 * Facet key → the Firestore field path it filters.
 *
 * 🛑 Every value here MUST have an entry in the products `SIEVE_FIELDS`, and
 * a `(status, listingType, <field>, createdAt DESC)` composite index. Miss the
 * first and sievejs drops the clause silently; miss the second and the query
 * throws FAILED_PRECONDITION, which `runQuery` logs and turns into an empty
 * grid. Both read to the user as "this filter matches nothing".
 * `scripts/audit-type-facet-wiring.mjs` checks all three ends.
 */
const TYPE_FACET_FIELD: Record<string, string> = {
  [TABLE_KEYS.CITY]: "classified.meetupArea.city",
  [TABLE_KEYS.NEGOTIABLE]: "classified.negotiable",
  [TABLE_KEYS.ACCEPTS_SHIPPING]: "classified.acceptsShipping",
  [TABLE_KEYS.DELIVERY_METHOD]: "digitalCode.codeDeliveryMethod",
  [TABLE_KEYS.SPECIES]: "liveItem.species",
  [TABLE_KEYS.LIVE_SEX]: "liveItem.sex",
  [TABLE_KEYS.JURISDICTION]: "liveItem.jurisdictionAllowed",
  [TABLE_KEYS.LIVE_TRANSPORT_METHOD]: "liveItem.transport.method",
};

/** Every field path a per-type facet can filter on. Read by the wiring audit. */
export const TYPE_FACET_FIELD_PATHS = Object.values(TYPE_FACET_FIELD);

/**
 * The ONE sort a per-type facet query is fetched at, so each facet needs one
 * composite index instead of one per offered sort. The user's chosen sort is
 * applied in memory afterwards. Changing this string invalidates all 8 indexes
 * — the audit derives its expected shapes from it, so it will say so.
 */
export const FACET_FETCH_SORT = sortBy(PRODUCT_FIELDS.CREATED_AT);

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
 * Read the availability scope, with a back-compat mapping for the three URL
 * spellings this replaced.
 *
 * An unrecognised token falls back to the caller's default rather than being
 * passed through — a raw query param must never reach a Firestore value.
 */
function readAvailability(
  get: (key: string) => string,
  fallback: AvailabilityFilter | undefined,
): AvailabilityFilter | undefined {
  const raw = get(TABLE_KEYS.AVAILABILITY);
  if (raw && isAvailabilityFilter(raw)) return raw;
  if (raw) return fallback;

  // `showSold` / `showEnded` / `showClosed` each meant "stop filtering", so
  // they map to `all`, NOT to `unavailable`. Kept only so links shared before
  // 2026-08-24 still resolve to something sensible; nothing writes them.
  if (
    get(TABLE_KEYS.SHOW_SOLD) === "true" ||
    get(TABLE_KEYS.SHOW_ENDED) === "true" ||
    get(TABLE_KEYS.SHOW_CLOSED) === "true"
  ) {
    return AVAILABILITY_VALUES.ALL;
  }
  return fallback;
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
     * The scope to use when the URL names none. Browse surfaces pass
     * `available` via `defaultAvailabilityForListingTypes`; the API route
     * leaves it undefined so non-browse callers keep seeing everything.
     */
    availability?: AvailabilityFilter;
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
    availability: readAvailability(get, defaults?.availability),
    // Now a plain drawer facet again. It used to double as the hide-ended
    // mechanism, which is why it only worked when exactly one listing type was
    // selected — `dateFieldFor` returns null otherwise, so /products silently
    // showed ended auctions in its default view.
    dateFrom: get(TABLE_KEYS.DATE_FROM) || undefined,
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
  // ANY_STATUS is the one opt-out, reserved for the authenticated dashboards.
  if (input.status !== ANY_STATUS) {
    parts.push(
      sieveFilter(
        PRODUCT_FIELDS.STATUS,
        SIEVE_OP.EQ,
        input.status || PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
      ),
    );
  }

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

  // `input.q` is deliberately NOT a filter clause.
  //
  // It used to be `title@=*<q>` pushed HERE — before the features, tags,
  // sublisting and typeFacets clauses below. The Firebase adapter throws on
  // case-insensitive operators and `throwExceptions: false` swallowed it, so
  // the processor returned the query as of the throw: with this clause first,
  // NOTHING was applied. Typing a search term discarded every facet the user
  // had selected AND the sort, and answered 200 with the whole catalogue.
  //
  // Search now travels as `query.search` (see PublicProductQuery) and becomes an
  // `array-contains` on `searchTxt` inside the repository, which is the only
  // shape Firestore can serve for token matching.

  /*
   * `array-contains-any` isn't supported by the Sieve Firebase adapter, so one
   * value pushes down as `array-contains` and several cannot.
   *
   * "Falls through to the caller" was the old comment here, and no caller ever
   * caught it — a two-tag selection filtered NOTHING while the chips stayed lit
   * and the badge counted them. The multi-value case now runs as a per-row
   * predicate over the bounded window (see `hasArrayMultiSelect` below), which
   * is the same trade the per-type facets make. A partial pushdown is not an
   * option: `array-contains` on the first value would return a strict SUBSET
   * for OR semantics, quietly hiding rows that match only the second.
   */
  if (input.features?.length === 1) {
    parts.push(sieveFilter(PRODUCT_FIELDS.FEATURES, SIEVE_OP.CONTAINS, input.features[0]));
  }
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
  const result = await productRepository.list(
    {
      filters: query.filters,
      sorts: query.sorts,
      page: query.page,
      pageSize: query.pageSize,
    },
    // Without this second argument the repository's searchTxt read path is
    // unreachable on the default executor, which is what every SSR listing view
    // uses. It was implemented and simply never called.
    query.search ? { search: query.search } : undefined,
  );
  return {
    items: result.items,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    hasMore: result.hasMore,
    cursor: null,
  };
}

/** Render one `UnavailableClause` as a Sieve clause against a fixed `now`. */
function clauseToSieve(clause: UnavailableClause, now: Date): string {
  const value = clause.value === "NOW" ? now.toISOString() : clause.value;
  return clause.op === "lt"
    ? sieveFilter(clause.field, SIEVE_OP.LT, value)
    : sieveFilter(clause.field, SIEVE_OP.EQ, value);
}

// ---------------------------------------------------------------------------
// The one public listing query
// ---------------------------------------------------------------------------
//
// AVAILABILITY IS ASYMMETRIC, and the asymmetry is what makes this tractable.
//
//   "unavailable" is SPARSE and expressible as an OR of EQUALITIES — sold out,
//   ended, closed, depleted. Firestore cannot OR across different fields, but
//   it can run each equality as its own bounded query, and merging N small
//   result sets in memory is cheap. That is Path C.
//
//   "available" is DENSE and NEGATION-shaped: NOT(a OR b OR c). There is no
//   query for that, so it stays what it has always been — one bounded window
//   in the caller's own sort order, filtered per row. That is fine precisely
//   because it is dense: nearly every row in the window passes.
//
// Path A ("all") applies no predicate at all and is therefore the only scope
// with true Firestore pagination and an exact total.

export async function listPublicProducts(
  input: PublicProductListInput,
  opts?: PublicProductListOptions,
): Promise<PublicProductListResult | null> {
  const now = opts?.now ?? new Date();
  const page = Math.max(1, input.page ?? DEFAULT_PAGE);
  const pageSize = Math.min(
    PUBLIC_PRODUCT_MAX_PAGE_SIZE,
    Math.max(1, input.pageSize ?? DEFAULT_PAGE_SIZE),
  );
  const sorts = input.sorts || DEFAULT_SORTS;
  const requestedSortField = sorts.replace(/^-/, "");
  const sortDesc = sorts.startsWith("-");

  const availability = input.availability ?? AVAILABILITY_VALUES.ALL;
  const wantAvailable = availability === AVAILABILITY_VALUES.AVAILABLE;
  const wantUnavailable = availability === AVAILABILITY_VALUES.UNAVAILABLE;

  const dateField = dateFieldFor(input.listingTypes);
  const hasDateRange = Boolean((input.dateFrom || input.dateTo) && dateField);
  // Firestore DOES accept one inequality when the query sorts by that same
  // field, so a matching date facet can still be pushed down.
  const canPushDate = hasDateRange && !wantAvailable && requestedSortField === dateField;

  const safeFilters = buildFirestoreSafeFilters(input);
  const dateClauses = [
    ...(canPushDate && input.dateFrom
      ? [sieveFilter(dateField as string, SIEVE_OP.GTE, input.dateFrom)]
      : []),
    ...(canPushDate && input.dateTo
      ? [sieveFilter(dateField as string, SIEVE_OP.LTE, input.dateTo)]
      : []),
  ];

  const executor = opts?.executor ?? defaultExecutor;
  const types = asListingTypes(input.listingTypes);

  // ── Path B: one type whose unavailability IS a pushable inequality, and the
  //    caller is already sorting by that field. Ended auctions sorted by end
  //    date is the whole reason this branch exists — it gives the archive real,
  //    unbounded-depth Firestore pagination instead of a 50-row window.
  const pushdown =
    wantUnavailable && types.length === 1 && !hasDateRange
      ? unavailableClausesFor(types).find(
          (c) => c.op === "lt" && c.sortField === requestedSortField,
        )
      : undefined;

  if (pushdown) {
    const filters = sieveAnd(safeFilters, clauseToSieve(pushdown, now));
    const result = await runQuery(executor, {
      filters,
      sorts,
      page,
      pageSize,
      cursor: input.cursor ?? null,
      search: input.q,
    });
    if (!result) return null;
    return finish({
      items: result.items as Row[],
      total: result.total,
      page: result.page,
      pageSize,
      totalPages: result.totalPages,
      hasMore: result.hasMore,
      cursor: result.cursor ?? null,
      truncated: false,
      filters,
      sorts,
      enabled: opts?.enabledListingTypes,
    viewer: opts?.viewer,
    });
  }

  // ── Path C: unavailable, everything else. One bounded query per distinct
  //    clause, run in parallel, merged and deduped. Nine listing types collapse
  //    to five clauses, so this is 5 × 50 = 250 documents in a single round —
  //    well inside Rule #6, and the same fan-out shape `computeRelatedItems`
  //    already uses.
  if (wantUnavailable) {
    const clauses = unavailableClausesFor(types);
    const results = await Promise.all(
      clauses.map((clause) => {
        // An inequality still has to be ordered by its own field, even here.
        const clauseSorts =
          clause.op === "lt" && clause.sortField
            ? sortBy(clause.sortField, "DESC")
            : sorts;
        return runQuery(executor, {
          filters: sieveAnd(safeFilters, clauseToSieve(clause, now)),
          sorts: clauseSorts,
          page: 1,
          pageSize: PUBLIC_PRODUCT_MAX_PAGE_SIZE,
          cursor: null,
          search: input.q,
        });
      }),
    );
    // One failed branch must not blank the whole scope — but it is already
    // logged loudly by `runQuery`, and it does mean the merge is incomplete,
    // which `truncated` communicates honestly.
    if (results.every((r) => r === null)) return null;

    const merged = new Map<string, Row>();
    let truncated = false;
    for (const result of results) {
      if (!result) {
        truncated = true;
        continue;
      }
      const rows = result.items as Row[];
      if (rows.length >= PUBLIC_PRODUCT_MAX_PAGE_SIZE) truncated = true;
      for (const row of rows) {
        const id = typeof row.id === "string" ? row.id : JSON.stringify(row.id);
        if (!merged.has(id)) merged.set(id, row);
      }
    }

    // Drop false positives — a clause selects a SUPERSET. A pre-order can hold
    // `availableQuantity: 0` from an over-signed allocation while still open,
    // and only the per-type predicate knows that.
    const rows = [...merged.values()].filter((row) => !isListingRowAvailable(row, now));
    const ordered = sortRows(rows, requestedSortField, sortDesc);
    const start = (page - 1) * pageSize;

    return finish({
      items: ordered.slice(start, start + pageSize),
      total: ordered.length,
      page,
      pageSize,
      totalPages: truncated
        ? page + 1
        : Math.max(1, Math.ceil(ordered.length / pageSize)),
      hasMore: truncated || start + pageSize < ordered.length,
      cursor: null,
      truncated,
      filters: clauses.map((c) => sieveAnd(safeFilters, clauseToSieve(c, now))).join(" OR "),
      sorts,
      enabled: opts?.enabledListingTypes,
    viewer: opts?.viewer,
    });
  }

  // ── Path A ("all") and the dense "available" case share one query. The only
  //    difference is whether a per-row predicate runs afterwards.
  const filters = sieveAnd(safeFilters, ...dateClauses);

  /*
   * A per-type facet IS pushed down — it is a sparse equality, which is the
   * side of the availability asymmetry that belongs in the query. What is not
   * tractable is the SORT cross-product: `(status, listingType, <facet>,
   * <sort>)` over 8 facets and the 7 publicly-offered sorts is 56 composite
   * indexes, and every sort added later costs 8 more.
   *
   * So the facet goes down and the SORT comes back up: fetch a bounded window
   * ordered by the one sort we index for every facet, then re-order in memory.
   * 56 indexes become 8, a new sort costs none, and `truncated` keeps the
   * pager honest — the same trade `fetchSorts` already makes for a date range
   * that cannot ride its own sort.
   *
   * Before this, none of the 8 had a public index at all: every facet on
   * /classified, /live and /digital-codes threw FAILED_PRECONDITION, which
   * `runQuery` logs and returns as null, i.e. an empty grid. The store-scoped
   * copies were indexed for 3 of the 7 sorts, so those pages worked until
   * someone chose "Name: A–Z".
   */
  const hasTypeFacet = Object.keys(input.typeFacets ?? {}).length > 0;
  /** Multi-value `tags`/`features` — no `array-contains-any`, so per-row. */
  const hasArrayMultiSelect = (input.tags?.length ?? 0) > 1 || (input.features?.length ?? 0) > 1;
  const inMemory =
    wantAvailable || hasTypeFacet || hasArrayMultiSelect || (hasDateRange && !canPushDate);

  // When a date range stays in memory, fetch in whichever direction front-loads
  // the rows that will PASS it: `dateFrom` (">=", still live) wants the most
  // future dates first; `dateTo` ("<=", ends by) wants the earliest first.
  // Fetching in the client's own order instead is what made live auctions
  // invisible once ~50 had already ended.
  const fetchSorts =
    inMemory && hasDateRange && !canPushDate && dateField
      ? input.dateFrom
        ? sortBy(dateField, "DESC")
        : sortBy(dateField, "ASC")
      : hasTypeFacet
        ? FACET_FETCH_SORT
        : sorts;

  const result = await runQuery(executor, {
    filters,
    sorts: fetchSorts,
    page: inMemory ? 1 : page,
    pageSize: inMemory ? PUBLIC_PRODUCT_MAX_PAGE_SIZE : pageSize,
    cursor: inMemory ? null : (input.cursor ?? null),
    search: input.q,
  });
  if (!result) return null;

  let items = result.items as Row[];
  let total = result.total;
  let totalPages = result.totalPages;
  let resultPage = result.page;
  let hasMore = result.hasMore;
  let cursor = result.cursor ?? null;
  let truncated = false;

  if (inMemory) {
    truncated = items.length >= PUBLIC_PRODUCT_MAX_PAGE_SIZE;
    /** OR semantics, matching the single-value `array-contains` pushdown. */
    const matchesAny = (raw: unknown, wanted: readonly string[]): boolean => {
      if (!Array.isArray(raw)) return false;
      return wanted.some((w) => raw.includes(w));
    };

    const filtered = items.filter((item) => {
      if (wantAvailable && !isListingRowAvailable(item, now)) return false;
      if (hasArrayMultiSelect) {
        if ((input.tags?.length ?? 0) > 1 && !matchesAny(item[PRODUCT_FIELDS.TAGS], input.tags!)) {
          return false;
        }
        if (
          (input.features?.length ?? 0) > 1 &&
          !matchesAny(item[PRODUCT_FIELDS.FEATURES], input.features!)
        ) {
          return false;
        }
      }
      if (hasDateRange && !canPushDate && dateField) {
        const raw = item[dateField];
        if (!raw) return false;
        const value = raw instanceof Date ? raw.toISOString() : String(raw);
        if (input.dateFrom && value < input.dateFrom) return false;
        if (input.dateTo && value > input.dateTo) return false;
      }
      return true;
    });

    const ordered =
      fetchSorts === sorts ? filtered : sortRows(filtered, requestedSortField, sortDesc);

    total = ordered.length;
    totalPages = truncated ? page + 1 : Math.max(1, Math.ceil(total / pageSize));
    resultPage = page;
    const start = (page - 1) * pageSize;
    items = ordered.slice(start, start + pageSize);
    hasMore = truncated || start + pageSize < total;
    cursor = null;
  }

  return finish({
    items,
    total,
    page: resultPage,
    pageSize,
    totalPages,
    hasMore,
    cursor,
    truncated,
    filters,
    sorts,
    enabled: opts?.enabledListingTypes,
    viewer: opts?.viewer,
  });
}

/**
 * Run one executor call, logging loudly and returning null on failure.
 *
 * Loud on purpose: a swallowed query failure is indistinguishable from an
 * empty catalogue at every call site above, which is exactly how the /art bug
 * hid for months (Root Cause #59).
 */
async function runQuery(
  executor: PublicProductExecutor,
  query: PublicProductQuery,
): Promise<ExecutorResult | null> {
  try {
    return await executor(query);
  } catch (error) {
    void normalizeError(error);
    serverLogger.error("listPublicProducts query failed", {
      filters: query.filters,
      sorts: query.sorts,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Apply the tester-visibility and feature-flag post-filters, then assemble. */
function finish(
  draft: PublicProductListResult & {
    enabled?: ReadonlySet<string>;
    viewer?: ViewerLike | null;
  },
): PublicProductListResult {
  const { enabled, viewer, ...result } = draft;
  const before = result.items.length;

  /*
   * Tester sandbox rows, unless the viewer may see them.
   *
   * 🛑 A post-filter, NOT a query clause. A Firestore inequality on the
   * test-data flag excludes every document that LACKS the field — which is all
   * real content, since the flag is new and optional — so such a query returns
   * ONLY test data, exactly inverting the intent. That trap is written up in
   * CLAUDE.md's tester section and is why `filterTestDataForViewer` exists as
   * an in-memory filter in the first place.
   *
   * Cheap: the flag is sparse (~25 documents), so this drops a handful of rows
   * from a page that was already fetched.
   */
  let items = filterTestDataForViewer(
    result.items as unknown as { isTestData?: boolean }[],
    viewer,
  ) as unknown as typeof result.items;

  // Feature-flagged-off types never reach a public surface.
  if (enabled && enabled.size > 0) {
    items = items.filter((it) => {
      const lt = typeof it.listingType === "string" ? it.listingType : "standard";
      return enabled.has(lt);
    });
  }

  const removed = before - items.length;
  return {
    ...result,
    items,
    total: removed > 0 ? Math.max(0, result.total - removed) : result.total,
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
      ...defaultAvailabilityForListingTypes(listingTypes),
    }),
    // The route owns the store identity — a `?storeId=` in the URL must not be
    // able to make one store's tab render another store's inventory.
    storeId,
  });
}

/**
 * Comparable primitive for one row value.
 *
 * 🛑 The `Date` branch is load-bearing. Without it a Date falls through to
 * `String(value)` — `"Wed Aug 30 2026 …"` — and a lexical compare of those
 * orders by WEEKDAY NAME. Every in-memory date sort was wrong: the "Sold &
 * Ended" tab ordered by `createdAt`/`auctionEndDate`, and now every per-type
 * facet under "Oldest First". A Firestore Timestamp arrives here as a Date via
 * `mapDoc`, so the ISO-string case is only for a row that has already been
 * serialised; both are handled.
 */
function sortKey(value: unknown): number | string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" || typeof value === "string") return value;
  return String(value);
}

function sortRows(rows: Row[], field: string, desc: boolean): Row[] {
  return [...rows].sort((a, b) => {
    const av = sortKey(a[field]);
    const bv = sortKey(b[field]);
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
