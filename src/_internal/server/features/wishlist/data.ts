import { cache } from "react";
import { wishlistRepository, type WishlistItem } from "../../../../repositories";

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
