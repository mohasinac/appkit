"use client";

import { useQuery } from "@tanstack/react-query";
import type { PreorderItem } from "../types";
import { PREORDER_ENDPOINTS } from "../../../constants/api-endpoints";

export function usePreorders(opts?: { endpoint?: string }) {
  const endpoint = opts?.endpoint ?? PREORDER_ENDPOINTS.LIST;
  return useQuery<PreorderItem[]>({
    queryKey: ["preorders"],
    queryFn: async () => {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch preorders");
      return res.json() as Promise<PreorderItem[]>;
    },
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
      const res = await fetch(endpoint);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch preorder");
      return res.json() as Promise<PreorderItem>;
    },
    enabled: !!slug,
    staleTime: 2 * 60 * 1000,
  });
}
