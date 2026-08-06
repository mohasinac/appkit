import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiClientError } from "../../../http/ApiClient";
import type { PreorderItem } from "../types";
import { PREORDER_ENDPOINTS } from "../../../constants/api-endpoints";

export function usePreorders(opts?: { endpoint?: string }) {
  const endpoint = opts?.endpoint ?? PREORDER_ENDPOINTS.LIST;
  return useQuery<PreorderItem[]>({
    queryKey: ["preorders"],
    queryFn: () =>
      apiClient
        .get<{ items: PreorderItem[] }>(endpoint)
        .then((res) => res.items ?? []),
    staleTime: 2 * 60 * 1000,
  });
}

export function usePreorder(
  slug: string | undefined,
  opts?: { endpoint?: string },
) {
  return useQuery<PreorderItem | null>({
    queryKey: ["preorders", slug],
    queryFn: async () => {
      if (!slug) return null;
      const endpoint = opts?.endpoint ?? PREORDER_ENDPOINTS.BY_SLUG(slug);
      try {
        return await apiClient.get<PreorderItem>(endpoint);
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 404) return null;
        throw err;
      }
    },
    enabled: !!slug,
    staleTime: 2 * 60 * 1000,
  });
}
