"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";

interface UseCartQueryOptions<TData> {
  endpoint: string;
  queryKey?: unknown[];
  enabled?: boolean;
  initialData?: TData;
}

export function useCartQuery<TData = unknown>(
  options: UseCartQueryOptions<TData>,
) {
  return useQuery<TData>({
    queryKey: options.queryKey ?? ["cart"],
    queryFn: () => apiClient.get<TData>(options.endpoint),
    enabled: options.enabled,
    initialData: options.initialData,
  });
}
