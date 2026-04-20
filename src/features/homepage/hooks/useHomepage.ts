import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { HomepageData } from "../types";
import { HOMEPAGE_ENDPOINTS } from "../../../constants/api-endpoints";

interface UseHomepageOptions {
  initialData?: HomepageData;
  enabled?: boolean;
}

export function useHomepage(opts?: UseHomepageOptions) {
  const query = useQuery<HomepageData>({
    queryKey: ["homepage"],
    queryFn: () => apiClient.get<HomepageData>(HOMEPAGE_ENDPOINTS.GET),
    initialData: opts?.initialData,
    enabled: opts?.enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    sections: query.data?.sections ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
