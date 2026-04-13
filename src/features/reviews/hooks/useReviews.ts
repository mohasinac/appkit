"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { ReviewListResponse, ReviewListParams } from "../types";

interface UseReviewsOptions {
  initialData?: ReviewListResponse;
  enabled?: boolean;
}

export function useReviews(
  params: ReviewListParams = {},
  opts?: UseReviewsOptions,
) {
  const sp = new URLSearchParams();
  if (params.productId) sp.set("productId", params.productId);
  if (params.userId) sp.set("userId", params.userId);
  if (params.status) sp.set("status", params.status);
  if (params.rating) sp.set("rating", String(params.rating));
  if (params.featured !== undefined)
    sp.set("featured", String(params.featured));
  if (params.page) sp.set("page", String(params.page));
  if (params.perPage) sp.set("perPage", String(params.perPage));
  if (params.sort) sp.set("sort", params.sort);
  const qs = sp.toString();

  const query = useQuery<ReviewListResponse>({
    queryKey: ["reviews", qs],
    queryFn: () =>
      apiClient.get<ReviewListResponse>(`/api/reviews${qs ? `?${qs}` : ""}`),
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
