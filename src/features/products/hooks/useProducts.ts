"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { useToast } from "../../../ui";
import { useOptionalSession } from "../../../react/contexts/SessionContext";
import { isAdminUser, isTesterUser } from "../../auth/role-predicates";
import type {
  ProductItem,
  ProductListResponse,
  ProductListParams,
} from "../types";
import { PRODUCT_ENDPOINTS } from "../../../constants/api-endpoints";

// --- useProducts --------------------------------------------------------------

interface UseProductsOptions<T extends ProductItem = ProductItem> {
  initialData?: ProductListResponse;
  enabled?: boolean;
  /**
   * How long (ms) React Query considers the data fresh before background-refetching.
   * Defaults to Infinity when `initialData` is supplied (SSR hydration — no refetch
   * on mount). Callers can override with a lower value if live data is needed.
   */
  staleTime?: number;
  /**
   * Map each API item to a richer app-level type.
   * The API always returns `ProductItem`; use this to project it to your own
   * extended type (e.g. `ProductDocument`) without forking the package.
   *
   * @example
   * const { products } = useProducts<ProductDocument>(params, {
   *   transform: (raw) => ({ ...raw, brand: raw.attributes?.brand ?? "" }),
   * });
   */
  transform?: (item: ProductItem) => T;
}

export function useProducts<T extends ProductItem = ProductItem>(
  params: ProductListParams = {},
  opts?: UseProductsOptions<T>,
) {
  const { showToast } = useToast();
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.category) sp.set("category", params.category);
  if (params.categorySlug) sp.set("categorySlug", params.categorySlug);
  if (params.status) sp.set("status", params.status);
  if (params.condition) sp.set("condition", params.condition);
  if (params.minPrice !== undefined)
    sp.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined)
    sp.set("maxPrice", String(params.maxPrice));
  // ALWAYS sent when the caller has a scope, including the default
  // "available". `/api/products` leaves `availability` unset (= all) so that
  // non-browse callers are unaffected — which means a browse component that
  // stopped sending it would filter on the SSR paint and NOT on the refetch,
  // and `staleTime: Infinity` would freeze that disagreement (Root Cause #30).
  // `audit-listing-filter-parity` asserts every listing component sends it.
  if (params.availability) sp.set("availability", params.availability);
  // SB1-G Phase 4 — canonical `listingType` URL param only.
  if (params.listingType !== undefined)
    sp.set("listingType", params.listingType);
  if (params.storeId) sp.set("storeId", params.storeId);
  if (params.sort) sp.set("sorts", params.sort);
  if (params.page) sp.set("page", String(params.page));
  if (params.perPage) sp.set("pageSize", String(params.perPage));
  if (params.featured !== undefined)
    sp.set("featured", String(params.featured));
  if (params.minBid !== undefined) sp.set("minBid", String(params.minBid));
  if (params.maxBid !== undefined) sp.set("maxBid", String(params.maxBid));
  if (params.dateFrom) sp.set("dateFrom", params.dateFrom);
  if (params.dateTo) sp.set("dateTo", params.dateTo);
  if (params.preOrderProductionStatus) sp.set("preOrderProductionStatus", params.preOrderProductionStatus);
  if (params.prizeRevealStatus) sp.set("prizeRevealStatus", params.prizeRevealStatus);
  if (params.brand) sp.set("brand", params.brand);
  if (params.freeShipping !== undefined)
    sp.set("freeShipping", String(params.freeShipping));
  // Pipe-joined multi-select facets. Omitted here until 2026-08-21, so the
  // Tags / Sublisting Type / Features drawer sections were inert.
  if (params.tags) sp.set("tags", params.tags);
  if (params.sublistingCategory) sp.set("sublistingCategory", params.sublistingCategory);
  if (params.features) sp.set("features", params.features);
  // Per-type facets travel under their own TABLE_KEY names, which is what
  // parsePublicProductParams reads them back from.
  for (const [key, value] of Object.entries(params.typeFacets ?? {})) {
    if (value) sp.set(key, value);
  }
  const qs = sp.toString();

  /*
   * 🛑 A TESTER MUST REFETCH; EVERYONE ELSE MUST KEEP THE CACHED SSR PAINT.
   *
   * Sandbox rows are correctly hidden from the public. But the SSR listing views
   * pass no `viewer` to `listPublicProducts`, so the server-rendered grid is the
   * anonymous one for EVERY visitor — and with `initialData` + `staleTime:
   * Infinity` the client never refetches, so a signed-in tester saw a catalogue
   * with no sandbox fixtures in it, on every listing page. The items were
   * reachable by direct URL, which is what made it look like a data problem
   * rather than a visibility one.
   *
   * The fix is NOT to read the session in those SSR views. `getServerSessionUser`
   * is a dynamic API, and calling it there would make every public listing page
   * per-request — no caching, a billed invocation per visitor, and every
   * `revalidate` silently overridden. That is Root Cause #82, and paying it for a
   * testing affordance would be a poor trade.
   *
   * `/api/products` ALREADY resolves the session and passes `viewer`. So the only
   * thing missing was a reason for the client to ask again: the query key now
   * carries the viewer class, giving testers their own cache entry, and their
   * `staleTime` is not frozen. Anonymous visitors keep the cached SSR data
   * untouched and issue no extra request.
   *
   * `useOptionalSession` rather than `useAuth()` on purpose — `useSession`
   * THROWS outside a provider, and making a public appkit hook require one would
   * be a breaking contract change (Root Cause #20). Absent provider degrades to
   * "not a tester", which is the fail-closed answer.
   */
  const session = useOptionalSession();
  const viewer = session?.user;
  const canSeeTestData = isTesterUser(viewer) || isAdminUser(viewer);

  const query = useQuery<ProductListResponse>({
    queryKey: ["products", qs, canSeeTestData ? "with-test-data" : "public"],
    queryFn: () =>
      apiClient.get<ProductListResponse>(
        `${PRODUCT_ENDPOINTS.LIST}${qs ? `?${qs}` : ""}`,
      ),
    // The SSR paint is the anonymous view, so it is only a valid starting point
    // for an anonymous viewer. Handing it to a tester would show them the very
    // rows this refetch exists to reveal.
    initialData: canSeeTestData ? undefined : opts?.initialData,
    staleTime:
      opts?.staleTime ??
      (!canSeeTestData && opts?.initialData != null ? Infinity : 0),
    enabled: opts?.enabled,
  });

  const warning = query.data?.warning;

  useEffect(() => {
    if (warning) showToast(warning, "error");
  }, [warning]);

  const rawItems = query.data?.items ?? [];
  const products = (
    opts?.transform ? rawItems.map(opts.transform) : rawItems
  ) as T[];

  return {
    products,
    total: query.data?.total ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    page: query.data?.page ?? 1,
    hasMore: query.data?.hasMore ?? false,
    /**
     * A bounded fetch hit its ceiling, so `total` is a floor. Render it as
     * "50+", never as an exact count, and never derive a final page from it.
     */
    truncated: query.data?.truncated ?? false,
    isLoading: query.isLoading,
    error: query.error,
    warning,
  };
}

// --- useProduct ---------------------------------------------------------------

interface UseProductOptions<T extends ProductItem = ProductItem> {
  initialData?: ProductItem;
  enabled?: boolean;
  staleTime?: number;
  /**
   * Map the API item to a richer app-level type.
   * @example
   * const { product } = useProduct<ProductDocument>(slug, {
   *   transform: (raw) => ({ ...raw, brand: raw.attributes?.brand ?? "" }),
   * });
   */
  transform?: (item: ProductItem) => T;
}

export function useProduct<T extends ProductItem = ProductItem>(
  slug: string,
  opts?: UseProductOptions<T>,
) {
  const query = useQuery<ProductItem>({
    queryKey: ["products", slug],
    queryFn: () => apiClient.get<ProductItem>(PRODUCT_ENDPOINTS.BY_SLUG(slug)),
    initialData: opts?.initialData,
    staleTime: opts?.staleTime ?? (opts?.initialData != null ? Infinity : 0),
    enabled: opts?.enabled !== false && !!slug,
  });

  const product =
    query.data && opts?.transform
      ? opts.transform(query.data)
      : (query.data as T | undefined);

  return {
    product,
    isLoading: query.isLoading,
    error: query.error,
  };
}
