import { useQuery } from "@tanstack/react-query";
import type { CollectionItem, CollectionListItem } from "../types";
import { COLLECTION_ENDPOINTS } from "../../../constants/api-endpoints";

export function useCollections(opts?: { endpoint?: string }) {
  const endpoint = opts?.endpoint ?? COLLECTION_ENDPOINTS.LIST;
  return useQuery<CollectionListItem[]>({
    queryKey: ["collections"],
    queryFn: async () => {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch collections");
      return res.json() as Promise<CollectionListItem[]>;
    },
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
      const res = await fetch(endpoint);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch collection");
      return res.json() as Promise<CollectionItem>;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}
