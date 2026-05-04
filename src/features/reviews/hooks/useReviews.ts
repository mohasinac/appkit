import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { ReviewListResponse, ReviewListParams } from "../types";
import { REVIEW_ENDPOINTS } from "../../../constants/api-endpoints";

interface UseReviewsOptions {
  initialData?: ReviewListResponse;
  enabled?: boolean;
  endpoint?: string;
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
  if (params.perPage) sp.set("perPage", String(params.perPage));
  if (params.sort) sp.set("sort", params.sort);
  if (params.q) sp.set("q", params.q);
  if (params.dateFrom) sp.set("dateFrom", params.dateFrom);
  if (params.dateTo) sp.set("dateTo", params.dateTo);
  if (params.minVotes !== undefined) sp.set("minVotes", String(params.minVotes));
  if (params.maxVotes !== undefined) sp.set("maxVotes", String(params.maxVotes));
  // General listing mode (no productId)
  if (!params.productId && !params.userId && !params.sellerId) {
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
    enabled: opts?.enabled,
  });

  return {
    reviews: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    hasMore: query.data?.hasMore ?? false,
    averageRating: query.data?.averageRating,
    ratingDistribution: query.data?.ratingDistribution,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

interface UseProductReviewsOptions {
  page?: number;
  pageSize?: number;
  enabled?: boolean;
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
      perPage: opts?.pageSize,
    },
    { enabled: opts?.enabled },
  );
}
