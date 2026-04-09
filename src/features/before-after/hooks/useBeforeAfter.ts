"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@mohasinac/http";
import type { BeforeAfterListResponse } from "../types";

interface UseBeforeAfterOptions {
  concern?: string;
  initialData?: BeforeAfterListResponse;
  enabled?: boolean;
}

export function useBeforeAfter(opts?: UseBeforeAfterOptions) {
  const sp = new URLSearchParams();
  if (opts?.concern) sp.set("concern", opts.concern);
  const qs = sp.toString();

  const query = useQuery<BeforeAfterListResponse>({
    queryKey: ["before-after", qs],
    queryFn: () =>
      apiClient.get<BeforeAfterListResponse>(`/api/before-after${qs ? `?${qs}` : ""}`),
    initialData: opts?.initialData,
    enabled: opts?.enabled,
    staleTime: 30 * 60 * 1000,
  });

  return {
    items: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
