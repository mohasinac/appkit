"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { PayoutListResponse, SellerPayoutSettings } from "../types";

export function useSellerPayouts(
  params: { page?: number; pageSize?: number; status?: string } = {},
  opts?: { enabled?: boolean },
) {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params.status) sp.set("status", params.status);
  const qs = sp.toString();

  const { data, isLoading, error, refetch } = useQuery<PayoutListResponse>({
    queryKey: ["seller-payouts", qs],
    queryFn: () =>
      apiClient.get<PayoutListResponse>(
        `/api/seller/payouts${qs ? `?${qs}` : ""}`,
      ),
    enabled: opts?.enabled ?? true,
  });

  return {
    payouts: data?.items ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export function useSellerPayoutSettings(opts?: { enabled?: boolean }) {
  const { data, isLoading, error, refetch } =
    useQuery<SellerPayoutSettings | null>({
      queryKey: ["seller-payout-settings"],
      queryFn: () =>
        apiClient.get<SellerPayoutSettings>("/api/seller/payout-settings"),
      enabled: opts?.enabled ?? true,
    });

  return {
    settings: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}
