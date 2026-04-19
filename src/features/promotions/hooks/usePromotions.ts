"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type {
  PromotionsListResponse,
  PromotionsListParams,
  CouponItem,
} from "../types";
import { PROMOTION_ENDPOINTS } from "../../../constants/api-endpoints";

export function usePromotions(
  params: PromotionsListParams = {},
  opts?: { enabled?: boolean },
) {
  const sp = new URLSearchParams();
  if (params.scope) sp.set("scope", params.scope);
  if (params.isActive !== undefined)
    sp.set("isActive", String(params.isActive));
  if (params.sellerId) sp.set("sellerId", params.sellerId);
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params.sort) sp.set("sorts", params.sort);
  if (params.filters) sp.set("filters", params.filters);
  const qs = sp.toString();

  const { data, isLoading, error, refetch } = useQuery<PromotionsListResponse>({
    queryKey: ["promotions", qs],
    queryFn: () =>
      apiClient.get<PromotionsListResponse>(
        `${PROMOTION_ENDPOINTS.LIST}${qs ? `?${qs}` : ""}`,
      ),
    enabled: opts?.enabled ?? true,
  });

  return {
    promotions: data?.items ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    hasMore: data?.hasMore ?? false,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export function useCoupon(code: string, opts?: { enabled?: boolean }) {
  const { data, isLoading, error } = useQuery<CouponItem | null>({
    queryKey: ["coupon", code],
    queryFn: () =>
      apiClient.get<CouponItem>(
        PROMOTION_ENDPOINTS.COUPON_BY_CODE(encodeURIComponent(code)),
      ),
    enabled: (opts?.enabled ?? true) && !!code,
  });

  return {
    coupon: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}
