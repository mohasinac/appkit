"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../http";

export function useSiteSettings<T = unknown>(
  endpoint = "/api/site-settings",
  staleTime = 10 * 60 * 1000,
) {
  return useQuery<T>({
    queryKey: ["site-settings", endpoint],
    queryFn: () => apiClient.get<T>(endpoint),
    staleTime,
  });
}
