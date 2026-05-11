/**
 * Wishlist Domain Actions (appkit)
 *
 * Pure business functions for wishlist CRUD and product-enriched reads.
 * Auth, rate-limiting, and Next.js specifics are handled by the consumer.
 */

import { ValidationError } from "../../../errors";
import {
  wishlistRepository,
  WishlistFullError,
  type UserWishlistItem,
} from "../repository/user-wishlist.repository";
import { productRepository } from "../../products/repository/products.repository";
import type { ProductDocument } from "../../products/schemas";

export { WishlistFullError } from "../repository/user-wishlist.repository";

export interface EnrichedWishlistItem extends UserWishlistItem {
  product: ProductDocument | null;
}

export async function addToWishlist(
  userSlug: string,
  productId: string,
  extras?: Parameters<typeof wishlistRepository.addItem>[2],
): Promise<{ count: number }> {
  if (!productId || typeof productId !== "string")
    throw new ValidationError("productId is required");
  const count = await wishlistRepository.addItem(userSlug, productId, extras);
  return { count };
}

export async function removeFromWishlist(
  userSlug: string,
  productId: string,
): Promise<void> {
  if (!productId || typeof productId !== "string")
    throw new ValidationError("productId is required");
  await wishlistRepository.removeItem(userSlug, productId);
}

export async function getWishlistForUser(userSlug: string): Promise<{
  items: EnrichedWishlistItem[];
  meta: { total: number };
}> {
  const items = await wishlistRepository.getWishlistItems(userSlug);

  const productResults = await Promise.allSettled(
    items.map((item) => productRepository.findById(item.productId)),
  );

  const enriched: EnrichedWishlistItem[] = items.map((item, i) => {
    const result = productResults[i];
    const product =
      result.status === "fulfilled" ? (result.value ?? null) : null;
    return { ...item, product };
  });

  return { items: enriched, meta: { total: enriched.length } };
}
