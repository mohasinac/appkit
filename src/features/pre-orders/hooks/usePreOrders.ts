"use client";

import { useQuery } from "@tanstack/react-query";
import type { PreorderItem } from "../types";
import { PREORDER_ENDPOINTS } from "../../../constants/api-endpoints";

export function usePreorders() {
  return useQuery<PreorderItem[]>({
    queryKey: ["preorders"],
    queryFn: async () => {
      const res = await fetch(PREORDER_ENDPOINTS.LIST);
      if (!res.ok) throw new Error("Failed to fetch preorders");
      return res.json() as Promise<PreorderItem[]>;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function usePreorder(slug: string | undefined) {
  return useQuery<PreorderItem | null>({
    queryKey: ["preorders", slug],
    queryFn: async () => {
      if (!slug) return null;
      const res = await fetch(PREORDER_ENDPOINTS.BY_SLUG(slug));
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch preorder");
      return res.json() as Promise<PreorderItem>;
    },
    enabled: !!slug,
    staleTime: 2 * 60 * 1000,
  });
}
