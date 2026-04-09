"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@mohasinac/http";
import type { WishlistResponse } from "../types";

interface UseWishlistOptions {
  initialData?: WishlistResponse;
  enabled?: boolean;
}

export function useWishlist(userId: string, opts?: UseWishlistOptions) {
  const query = useQuery<WishlistResponse>({
    queryKey: ["wishlist", userId],
    queryFn: () =>
      apiClient.get<WishlistResponse>(`/api/wishlist?userId=${userId}`),
    initialData: opts?.initialData,
    enabled: opts?.enabled !== false && !!userId,
  });

  const ids = new Set((query.data?.items ?? []).map((i) => i.productId));

  return {
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    wishlistedIds: ids,
    isWishlisted: (productId: string) => ids.has(productId),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
