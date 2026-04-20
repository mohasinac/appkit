import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import type { WishlistResponse } from "../types";
import { WISHLIST_ENDPOINTS } from "../../../constants/api-endpoints";

interface UseWishlistOptions {
  initialData?: WishlistResponse;
  enabled?: boolean;
  endpoint?: string;
}

export function useWishlist(userId: string, opts?: UseWishlistOptions) {
  const endpoint = opts?.endpoint ?? WISHLIST_ENDPOINTS.BY_USER(userId);
  const query = useQuery<WishlistResponse>({
    queryKey: ["wishlist", userId],
    queryFn: () =>
      apiClient.get<WishlistResponse>(endpoint),
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
