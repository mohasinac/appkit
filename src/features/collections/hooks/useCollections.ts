import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiClientError } from "../../../http/ApiClient";
import type { CollectionItem, CollectionListItem } from "../types";
import { COLLECTION_ENDPOINTS } from "../../../constants/api-endpoints";

export function useCollections(opts?: { endpoint?: string }) {
  const endpoint = opts?.endpoint ?? COLLECTION_ENDPOINTS.LIST;
  return useQuery<CollectionListItem[]>({
    queryKey: ["collections"],
    queryFn: () =>
      apiClient
        .get<{ items: CollectionListItem[] }>(endpoint)
        .then((res) => res.items ?? []),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCollection(
  slug: string | undefined,
  opts?: { endpoint?: string },
) {
  return useQuery<CollectionItem | null>({
    queryKey: ["collections", slug],
    queryFn: async () => {
      if (!slug) return null;
      const endpoint = opts?.endpoint ?? COLLECTION_ENDPOINTS.BY_SLUG(slug);
      try {
        return await apiClient.get<CollectionItem>(endpoint);
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 404) return null;
        throw err;
      }
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}
