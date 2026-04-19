"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { Order, OrderListResponse, OrderListParams } from "../types";
import type { TrackingInfo } from "../../../contracts/shipping";
import { ORDER_ENDPOINTS } from "../../../constants/api-endpoints";

interface UseOrdersOptions {
  initialData?: OrderListResponse;
  enabled?: boolean;
  endpoint?: string;
}

export function useOrders(
  params: OrderListParams = {},
  opts?: UseOrdersOptions,
) {
  const sp = new URLSearchParams();
  if (params.userId) sp.set("userId", params.userId);
  if (params.orderStatus) sp.set("orderStatus", params.orderStatus);
  if (params.paymentStatus) sp.set("paymentStatus", params.paymentStatus);
  if (params.sort) sp.set("sort", params.sort);
  if (params.page) sp.set("page", String(params.page));
  if (params.perPage) sp.set("perPage", String(params.perPage));
  const qs = sp.toString();
  const endpoint = opts?.endpoint ?? `${ORDER_ENDPOINTS.LIST}${qs ? `?${qs}` : ""}`;

  const query = useQuery<OrderListResponse>({
    queryKey: ["orders", qs],
    queryFn: () =>
      apiClient.get<OrderListResponse>(endpoint),
    initialData: opts?.initialData,
    enabled: opts?.enabled,
  });

  return {
    orders: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useOrder(
  id: string,
  opts?: { initialData?: Order; enabled?: boolean; endpoint?: string },
) {
  const endpoint = opts?.endpoint ?? ORDER_ENDPOINTS.BY_ID(id);
  const query = useQuery<Order>({
    queryKey: ["orders", id],
    queryFn: () => apiClient.get<Order>(endpoint),
    initialData: opts?.initialData,
    enabled: opts?.enabled !== false && !!id,
  });

  return { order: query.data, isLoading: query.isLoading, error: query.error };
}

export function useTrackOrder(
  trackingId: string | null | undefined,
  opts?: { enabled?: boolean; endpoint?: string },
) {
  const endpoint = opts?.endpoint ?? ORDER_ENDPOINTS.TRACK(trackingId!);
  const query = useQuery<TrackingInfo | null>({
    queryKey: ["order-tracking", trackingId],
    queryFn: () =>
      apiClient.get<TrackingInfo>(endpoint),
    enabled: opts?.enabled !== false && !!trackingId,
  });

  return {
    trackingInfo: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
