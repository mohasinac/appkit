import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../http";
import { SITE_SETTINGS_ENDPOINTS } from "../../constants/api-endpoints";

export function useSiteSettings<T = unknown>(
  endpoint = SITE_SETTINGS_ENDPOINTS.GET,
  staleTime = 10 * 60 * 1000,
) {
  return useQuery<T>({
    queryKey: ["site-settings", endpoint],
    queryFn: () => apiClient.get<T>(endpoint),
    staleTime,
  });
}
