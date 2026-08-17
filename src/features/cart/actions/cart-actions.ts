/**
 * Cart Domain Actions (appkit)
 *
 * Pure business functions — auth, rate-limiting, and Next.js specifics
 * are handled by the calling server action in the consumer.
 */

import { serverLogger } from "../../../monitoring";
import { ValidationError } from "../../../errors";
import { cartRepository } from "../repository/cart.repository";
import { productRepository } from "../../products/repository/products.repository";
import { storeRepository } from "../../stores/repository/store.repository";
import { normalizeListingType } from "../../products/utils/listing-type";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import type {
  AddToCartInput,
  CartDocument,
  UpdateCartItemInput,
} from "../schemas";

/**
 * Product documents don't always carry a denormalized `storeName` — the
 * create routes only set it when the caller explicitly passes one, so
 * listings created without it leave the field undefined forever. Cart items
 * built from those products then fell back to displaying the raw `storeId`
 * slug (e.g. "store-letitrip-official") in the UI. Resolving from the store
 * document here — the single add-to-cart chokepoint — fixes every caller at
 * once instead of patching each product-creation call site.
 */
async function resolveStoreName(storeId: string, candidate: string | undefined): Promise<string> {
  if (candidate) return candidate;
  const store = await storeRepository.findById(storeId).catch(() => null);
  return store?.storeName ?? storeId;
}

export async function addItemToCart(
  userId: string,
  input: AddToCartInput,
): Promise<CartDocument> {
  serverLogger.debug("addItemToCart", { userId, productId: input.productId });
  // SB-UNI-F 2026-05-13 — capability gate. Classified + live listings reject
  // add-to-cart at the action layer. UI surfaces a chat-only / jurisdiction
  // CTA for those types instead.
  const { canAddToCart } = await import(
    "../../../_internal/shared/listing-types/capabilities"
  );
  if (!canAddToCart(input.listingType)) {
    throw new ValidationError(
      `Listings of type "${input.listingType}" cannot be added to the cart.`,
    );
  }
  const storeName = await resolveStoreName(input.storeId, input.storeName);
  return cartRepository.addItem(userId, { ...input, storeName });
}

export async function updateCartItem(
  userId: string,
  itemId: string,
  input: UpdateCartItemInput,
): Promise<CartDocument> {
  return cartRepository.updateItem(userId, itemId, input);
}

export async function removeCartItem(
  userId: string,
  itemId: string,
): Promise<CartDocument> {
  return cartRepository.removeItem(userId, itemId);
}

export async function clearCart(userId: string): Promise<CartDocument> {
  return cartRepository.clearCart(userId);
}


export async function mergeGuestCart(
  userId: string,
  items: Array<{ productId: string; quantity: number }>,
): Promise<void> {
  await cartRepository.getOrCreate(userId);

  for (const item of items) {
    const product = await productRepository.findById(item.productId);
    if (!product || product.status !== "published") continue;
    if (product.availableQuantity < 1) continue;

    const safeQty = Math.min(item.quantity, product.availableQuantity);

    const storeName = await resolveStoreName(product.storeId, product.storeName);
    await cartRepository.addItem(userId, {
      productId: product.id,
      productTitle: product.title,
      productImage: product.images?.[0] ?? "",
      price: product.price,
      currency: product.currency ?? getDefaultCurrency(),
      quantity: safeQty,
      storeId: product.storeId,
      storeName,
      listingType: normalizeListingType(product),
    });
  }

  serverLogger.info("mergeGuestCart completed", {
    userId,
    itemCount: items.length,
  });
}

export async function getCart(userId: string): Promise<CartDocument | null> {
  return cartRepository.findByUserId(userId);
}

export async function updateCartItemShipping(
  userId: string,
  itemId: string,
  providerId: string,
  feeInPaise: number,
): Promise<CartDocument> {
  if (!itemId || !providerId) throw new ValidationError("itemId and providerId are required");
  if (!Number.isFinite(feeInPaise) || feeInPaise < 0) {
    throw new ValidationError("feeInPaise must be a non-negative number");
  }
  return cartRepository.updateItemShipping(userId, itemId, providerId, feeInPaise);
}
