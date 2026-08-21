import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { ReviewListResponse, ReviewListParams } from "../types";
import { REVIEW_ENDPOINTS } from "../../../constants/api-endpoints";

interface UseReviewsOptions {
  initialData?: ReviewListResponse;
  enabled?: boolean;
  endpoint?: string;
  staleTime?: number;
}

export function useReviews(
  params: ReviewListParams = {},
  opts?: UseReviewsOptions,
) {
  const sp = new URLSearchParams();
  if (params.productId) sp.set("productId", params.productId);
  if (params.userId) sp.set("userId", params.userId);
  if (params.status) sp.set("status", params.status);
  if (params.rating !== undefined) sp.set("rating", String(params.rating));
  if (params.featured !== undefined)
    sp.set("featured", String(params.featured));
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params.sort) sp.set("sort", params.sort);
  if (params.q) sp.set("q", params.q);
  if (params.dateFrom) sp.set("dateFrom", params.dateFrom);
  if (params.dateTo) sp.set("dateTo", params.dateTo);
  if (params.minVotes !== undefined) sp.set("minVotes", String(params.minVotes));
  if (params.maxVotes !== undefined) sp.set("maxVotes", String(params.maxVotes));
  if (params.hasImages) sp.set("hasImages", "true");
  // General listing mode (no productId). Store-scoped reads go through
  // useStoreReviews / `/api/stores/[slug]/reviews`, not this endpoint — `/api/reviews`
  // has no storeId branch, so a storeId here would 400 on the productId guard.
  if (!params.productId && !params.userId) {
    sp.set("latest", "true");
  }
  const qs = sp.toString();

  const query = useQuery<ReviewListResponse>({
    queryKey: ["reviews", qs],
    queryFn: () =>
      apiClient.get<ReviewListResponse>(
        `${REVIEW_ENDPOINTS.LIST}${qs ? `?${qs}` : ""}`,
      ),
    initialData: opts?.initialData,
    staleTime: opts?.staleTime ?? (opts?.initialData !== undefined ? Infinity : 0),
    enabled: opts?.enabled,
  });

  return {
    reviews: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    hasMore: query.data?.hasMore ?? false,
    averageRating: query.data?.averageRating,
    ratingDistribution: query.data?.ratingDistribution,
    totalApproved: query.data?.totalApproved,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

interface UseProductReviewsOptions {
  page?: number;
  pageSize?: number;
  sort?: string;
  rating?: number | string;
  dateFrom?: string;
  dateTo?: string;
  hasImages?: boolean;
  enabled?: boolean;
  initialData?: ReviewListResponse;
}

export function useProductReviews(
  productId: string,
  opts?: UseProductReviewsOptions,
) {
  return useReviews(
    {
      productId,
      status: "approved",
      page: opts?.page,
      pageSize: opts?.pageSize,
      sort: opts?.sort,
      rating: opts?.rating,
      dateFrom: opts?.dateFrom,
      dateTo: opts?.dateTo,
      hasImages: opts?.hasImages,
    },
    { enabled: opts?.enabled, initialData: opts?.initialData },
  );
}
