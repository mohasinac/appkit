"use client"
import { useWishlist } from "./useWishlist";
import { useGuestWishlist } from "./useGuestWishlist";
import type { WishlistResponse } from "../types";

interface UseWishlistWithGuestOptions {
  initialData?: WishlistResponse;
  enabled?: boolean;
  endpoint?: string;
}

/**
 * useWishlistWithGuest
 *
 * Unified wishlist hook that uses API for authenticated users
 * and localStorage for guest users.
 */
export function useWishlistWithGuest(userId: string | null | undefined, opts?: UseWishlistWithGuestOptions) {
  const isAuthenticated = !!userId;
  
  // For authenticated users
  const authenticatedWishlist = useWishlist(userId ?? "", {
    ...opts,
    enabled: opts?.enabled !== false && isAuthenticated,
  });

  // For guest users
  const guestWishlist = useGuestWishlist();

  // Return appropriate wishlist based on authentication status
  if (isAuthenticated) {
    return {
      items: authenticatedWishlist.items,
      total: authenticatedWishlist.total,
      wishlistedIds: authenticatedWishlist.wishlistedIds,
      isWishlisted: authenticatedWishlist.isWishlisted,
      isLoading: authenticatedWishlist.isLoading,
      error: authenticatedWishlist.error,
      refetch: authenticatedWishlist.refetch,
      isGuest: false,
    };
  } else {
    // Convert guest items to wishlist items format
    const items = guestWishlist.items.map((item) => ({
      id: `${item.type}-${item.itemId}`,
      productId: item.type === "product" ? item.itemId : "",
      productTitle: item.title,
      productImage: item.image,
      productPrice: 0,
      productSlug: item.itemId,
      addedAt: item.addedAt,
      type: item.type,
    }));

    const ids = new Set(items.map((i) => i.productId).filter(Boolean));

    return {
      items,
      total: guestWishlist.count,
      wishlistedIds: ids,
      isWishlisted: (productId: string) => ids.has(productId),
      isLoading: !guestWishlist.isInitialized,
      error: null,
      refetch: async () => {},
      isGuest: true,
      guestWishlist, // Expose guest wishlist for add/remove operations
    };
  }
}
