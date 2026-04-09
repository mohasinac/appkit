"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@mohasinac/http";

export interface UserWishlistItem<TProduct = unknown> {
  productId: string;
  addedAt: string;
  product: TProduct | null;
}

export interface UserWishlistResponse<TProduct = unknown> {
  items: UserWishlistItem<TProduct>[];
  meta: { total: number };
}

interface UseUserWishlistOptions<TProduct> {
  enabled?: boolean;
  endpoint?: string;
  queryKey?: unknown[];
  initialData?: UserWishlistResponse<TProduct>;
}

export function useUserWishlist<TProduct = unknown>(
  options?: UseUserWishlistOptions<TProduct>,
) {
  const endpoint = options?.endpoint ?? "/api/user/wishlist";
  const query = useQuery<UserWishlistResponse<TProduct>>({
    queryKey: options?.queryKey ?? ["user", "wishlist"],
    queryFn: () => apiClient.get<UserWishlistResponse<TProduct>>(endpoint),
    enabled: options?.enabled ?? true,
    initialData: options?.initialData,
  });

  return {
    ...query,
    total: query.data?.meta.total ?? 0,
  };
}
