/**
 * Wishlist Domain Actions (appkit)
 *
 * Pure business functions for wishlist CRUD and product-enriched reads.
 * Auth, rate-limiting, and Next.js specifics are handled by the consumer.
 */

import { ValidationError } from "../../../errors";
import { wishlistRepository } from "../repository/user-wishlist.repository";
import { productRepository } from "../../products/repository/products.repository";
import type { ProductDocument } from "../../products/schemas";

export interface EnrichedWishlistItem {
  productId: string;
  addedAt: Date;
  product: ProductDocument | null;
}

export async function addToWishlist(
  userId: string,
  productId: string,
): Promise<void> {
  if (!productId || typeof productId !== "string")
    throw new ValidationError("productId is required");
  await wishlistRepository.addItem(userId, productId);
}

export async function removeFromWishlist(
  userId: string,
  productId: string,
): Promise<void> {
  if (!productId || typeof productId !== "string")
    throw new ValidationError("productId is required");
  await wishlistRepository.removeItem(userId, productId);
}

export async function getWishlistForUser(userId: string): Promise<{
  items: EnrichedWishlistItem[];
  meta: { total: number };
}> {
  const items = await wishlistRepository.getWishlistItems(userId);

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
