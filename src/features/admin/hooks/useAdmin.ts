"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { DashboardStats } from "../types";

export function useDashboardStats(opts?: {
  initialData?: DashboardStats;
  enabled?: boolean;
}) {
  const query = useQuery<DashboardStats>({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: () => apiClient.get<DashboardStats>("/api/admin/stats"),
    initialData: opts?.initialData,
    enabled: opts?.enabled,
    staleTime: 60 * 1000,
  });

  return { stats: query.data, isLoading: query.isLoading, error: query.error };
}
