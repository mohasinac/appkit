"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type {
  SellerStore,
  SellerDashboardStats,
  SellerAnalytics,
} from "../types";

export function useSellerStore(opts?: { enabled?: boolean }) {
  const { data, isLoading, error, refetch } = useQuery<SellerStore | null>({
    queryKey: ["seller-store"],
    queryFn: () => apiClient.get<SellerStore>("/api/seller/store"),
    enabled: opts?.enabled ?? true,
  });

  return {
    store: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export function useSellerDashboard(opts?: { enabled?: boolean }) {
  const { data, isLoading, error, refetch } = useQuery<SellerDashboardStats>({
    queryKey: ["seller-dashboard"],
    queryFn: () => apiClient.get<SellerDashboardStats>("/api/seller/dashboard"),
    enabled: opts?.enabled ?? true,
    staleTime: 60_000,
  });

  return {
    stats: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export function useSellerAnalytics(
  period = "30d",
  opts?: { enabled?: boolean },
) {
  const { data, isLoading, error, refetch } = useQuery<SellerAnalytics>({
    queryKey: ["seller-analytics", period],
    queryFn: () =>
      apiClient.get<SellerAnalytics>(`/api/seller/analytics?period=${period}`),
    enabled: opts?.enabled ?? true,
    staleTime: 5 * 60_000,
  });

  return {
    analytics: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}
