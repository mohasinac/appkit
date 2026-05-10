import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
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
  if (params.inStock !== undefined) sp.set("inStock", String(params.inStock));
  if (params.isAuction !== undefined)
    sp.set("isAuction", String(params.isAuction));
  if (params.isPreOrder !== undefined)
    sp.set("isPreOrder", String(params.isPreOrder));
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
  if (params.brand) sp.set("brand", params.brand);
  if (params.freeShipping !== undefined)
    sp.set("freeShipping", String(params.freeShipping));
  const qs = sp.toString();

  const query = useQuery<ProductListResponse>({
    queryKey: ["products", qs],
    queryFn: () =>
      apiClient.get<ProductListResponse>(
        `${PRODUCT_ENDPOINTS.LIST}${qs ? `?${qs}` : ""}`,
      ),
    initialData: opts?.initialData,
    staleTime: opts?.staleTime ?? (opts?.initialData != null ? Infinity : 0),
    enabled: opts?.enabled,
  });

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
    isLoading: query.isLoading,
    error: query.error,
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
