import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { BeforeAfterListResponse } from "../types";
import { BEFORE_AFTER_ENDPOINTS } from "../../../constants/api-endpoints";

interface UseBeforeAfterOptions {
  concern?: string;
  initialData?: BeforeAfterListResponse;
  enabled?: boolean;
  endpoint?: string;
}

export function useBeforeAfter(opts?: UseBeforeAfterOptions) {
  const sp = new URLSearchParams();
  if (opts?.concern) sp.set("concern", opts.concern);
  const qs = sp.toString();
  const endpoint = opts?.endpoint ?? `${BEFORE_AFTER_ENDPOINTS.LIST}${qs ? `?${qs}` : ""}`;

  const query = useQuery<BeforeAfterListResponse>({
    queryKey: ["before-after", qs],
    queryFn: () =>
      apiClient.get<BeforeAfterListResponse>(endpoint),
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
