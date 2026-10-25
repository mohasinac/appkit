import { cache } from "react";
import { wishlistRepository } from "../../../../features/wishlist/repository/user-wishlist.repository";
// 🛑 ALIASED re-export: `repositories/index.ts:164` exports this as
// `type UserWishlistItem as WishlistItem`. The defining module names it
// UserWishlistItem, so the local name has to be restored here.
import type { UserWishlistItem as WishlistItem } from "../../../../features/wishlist/repository/user-wishlist.repository";

export const getWishlistForUser = cache(
  async (userId: string): Promise<{ items: WishlistItem[]; meta: { total: number } }> => {
    const items = await wishlistRepository.getWishlistItems(userId).catch(() => [] as WishlistItem[]);
    return { items, meta: { total: items.length } };
  },
);

export const isProductInWishlist = cache(
  async (userId: string, productId: string): Promise<boolean> => {
    return wishlistRepository.isInWishlist(userId, productId).catch(() => false);
  },
);
