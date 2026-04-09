"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@mohasinac/http";
import type {
  ProductItem,
  ProductListResponse,
  ProductListParams,
} from "../types";

// ─── useProducts ──────────────────────────────────────────────────────────────

interface UseProductsOptions<T extends ProductItem = ProductItem> {
  initialData?: ProductListResponse;
  enabled?: boolean;
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
  if (params.status) sp.set("status", params.status);
  if (params.condition) sp.set("condition", params.condition);
  if (params.minPrice !== undefined)
    sp.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined)
    sp.set("maxPrice", String(params.maxPrice));
  if (params.inStock !== undefined) sp.set("inStock", String(params.inStock));
  if (params.isAuction !== undefined)
    sp.set("isAuction", String(params.isAuction));
  if (params.sellerId) sp.set("sellerId", params.sellerId);
  if (params.sort) sp.set("sorts", params.sort);
  if (params.page) sp.set("page", String(params.page));
  if (params.perPage) sp.set("pageSize", String(params.perPage));
  if (params.featured !== undefined)
    sp.set("featured", String(params.featured));
  const qs = sp.toString();

  const query = useQuery<ProductListResponse>({
    queryKey: ["products", qs],
    queryFn: () =>
      apiClient.get<ProductListResponse>(`/api/products${qs ? `?${qs}` : ""}`),
    initialData: opts?.initialData,
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

// ─── useProduct ───────────────────────────────────────────────────────────────

interface UseProductOptions<T extends ProductItem = ProductItem> {
  initialData?: ProductItem;
  enabled?: boolean;
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
    queryFn: () => apiClient.get<ProductItem>(`/api/products/${slug}`),
    initialData: opts?.initialData,
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
