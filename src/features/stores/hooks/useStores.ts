import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type {
  StoreListResponse,
  StoreListParams,
  StoreDetail,
  StoreProductsResponse,
  StoreAuctionsResponse,
  StoreReviewsData,
} from "../types";
import { STORE_ENDPOINTS } from "../../../constants/api-endpoints";

interface UseStoresOptions {
  enabled?: boolean;
  endpoint?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any;
  staleTime?: number;
}

export function useStores(
  params: StoreListParams = {},
  opts?: UseStoresOptions,
) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.category) sp.set("category", params.category);
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params.sort) sp.set("sorts", params.sort);
  if (params.filters) sp.set("filters", params.filters);
  const qs = sp.toString();
  const endpoint = opts?.endpoint ?? `${STORE_ENDPOINTS.LIST}${qs ? `?${qs}` : ""}`;

  const { data, isLoading, error, refetch } = useQuery<StoreListResponse>({
    queryKey: ["stores", qs],
    queryFn: () =>
      apiClient.get<StoreListResponse>(endpoint),
    initialData: opts?.initialData,
    staleTime: opts?.staleTime ?? (opts?.initialData !== undefined ? Infinity : 0),
    enabled: opts?.enabled ?? true,
  });

  return {
    stores: data?.items ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    hasMore: data?.hasMore ?? false,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export function useStoreBySlug(
  storeSlug: string,
  opts?: { enabled?: boolean; endpoint?: string },
) {
  const endpoint = opts?.endpoint ?? STORE_ENDPOINTS.BY_SLUG(storeSlug);
  const { data, isLoading, error, refetch } = useQuery<StoreDetail | null>({
    queryKey: ["store", storeSlug],
    queryFn: () => apiClient.get<StoreDetail>(endpoint),
    enabled: (opts?.enabled ?? true) && !!storeSlug,
  });

  return {
    store: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export function useStoreProducts(
  storeSlug: string,
  params?: string,
  opts?: { enabled?: boolean; endpoint?: string },
) {
  const endpoint = opts?.endpoint ?? `${STORE_ENDPOINTS.PRODUCTS(storeSlug)}${params ? `?${params}` : ""}`;
  const { data, isLoading, error, refetch } = useQuery<StoreProductsResponse>({
    queryKey: ["store-products", storeSlug, params ?? ""],
    queryFn: () =>
      apiClient.get<StoreProductsResponse>(endpoint),
    enabled: (opts?.enabled ?? true) && !!storeSlug,
  });

  return {
    products: data?.items ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export function useStoreAuctions(
  storeSlug: string,
  params?: string,
  opts?: { enabled?: boolean; endpoint?: string },
) {
  const endpoint = opts?.endpoint ?? `${STORE_ENDPOINTS.AUCTIONS(storeSlug)}${params ? `?${params}` : ""}`;
  const { data, isLoading, error, refetch } = useQuery<StoreAuctionsResponse>({
    queryKey: ["store-auctions", storeSlug, params ?? ""],
    queryFn: () =>
      apiClient.get<StoreAuctionsResponse>(endpoint),
    enabled: (opts?.enabled ?? true) && !!storeSlug,
  });

  return {
    auctions: data?.items ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export function useStoreReviews(
  storeSlug: string,
  params?: {
    rating?: number;
    page?: number;
    pageSize?: number;
    sort?: string;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    hasImages?: boolean;
  },
  opts?: { enabled?: boolean; endpoint?: string },
) {
  const sp = new URLSearchParams();
  if (params?.rating) sp.set("rating", String(params.rating));
  if (params?.page && params.page > 1) sp.set("page", String(params.page));
  if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params?.sort) sp.set("sort", params.sort);
  if (params?.q) sp.set("q", params.q);
  if (params?.dateFrom) sp.set("dateFrom", params.dateFrom);
  if (params?.dateTo) sp.set("dateTo", params.dateTo);
  if (params?.hasImages) sp.set("hasImages", "true");
  const qs = sp.toString();
  const baseEndpoint = opts?.endpoint ?? STORE_ENDPOINTS.REVIEWS(storeSlug);
  const endpoint = qs ? `${baseEndpoint}?${qs}` : baseEndpoint;

  const { data, isLoading, error, refetch } = useQuery<StoreReviewsData>({
    queryKey: ["store-reviews", storeSlug, qs],
    queryFn: () => apiClient.get<StoreReviewsData>(endpoint),
    enabled: (opts?.enabled ?? true) && !!storeSlug,
  });

  return {
    reviews: data?.reviews ?? [],
    averageRating: data?.averageRating ?? 0,
    totalReviews: data?.totalReviews ?? 0,
    totalFiltered: data?.totalFiltered ?? 0,
    totalPages: data?.totalPages ?? 1,
    ratingDistribution: data?.ratingDistribution ?? {},
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}
