"use client";

import { useQuery } from "@tanstack/react-query";
import type { CollectionItem, CollectionListItem } from "../types";

export function useCollections() {
  return useQuery<CollectionListItem[]>({
    queryKey: ["collections"],
    queryFn: async () => {
      const res = await fetch("/api/collections");
      if (!res.ok) throw new Error("Failed to fetch collections");
      return res.json() as Promise<CollectionListItem[]>;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCollection(slug: string | undefined) {
  return useQuery<CollectionItem | null>({
    queryKey: ["collections", slug],
    queryFn: async () => {
      if (!slug) return null;
      const res = await fetch(`/api/collections/${slug}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch collection");
      return res.json() as Promise<CollectionItem>;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}
