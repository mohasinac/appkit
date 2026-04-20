import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { DashboardStats } from "../types";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

export function useDashboardStats(opts?: {
  initialData?: DashboardStats;
  enabled?: boolean;
}) {
  const query = useQuery<DashboardStats>({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: () => apiClient.get<DashboardStats>(ADMIN_ENDPOINTS.STATS),
    initialData: opts?.initialData,
    enabled: opts?.enabled,
    staleTime: 60 * 1000,
  });

  return { stats: query.data, isLoading: query.isLoading, error: query.error };
}
