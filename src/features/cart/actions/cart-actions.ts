/**
 * Cart Domain Actions (appkit)
 *
 * Pure business functions — auth, rate-limiting, and Next.js specifics
 * are handled by the calling server action in the consumer.
 */

import { serverLogger } from "../../../monitoring";
import { ValidationError, NotFoundError } from "../../../errors";
import { cartRepository } from "../repository/cart.repository";
import { productRepository } from "../../products/repository/products.repository";
import { categoriesRepository } from "../../categories/repository/categories.repository";
import { normalizeListingType } from "../../products/utils/listing-type";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import type {
  AddToCartInput,
  CartDocument,
  UpdateCartItemInput,
} from "../schemas";

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
  return cartRepository.addItem(userId, input);
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

/**
 * SB-UNI-4 2026-05-13 — add a bundle (categoryType:"bundle" row) to the
 * cart as a single cart line. Validates the bundle exists, has at least one
 * product mirror, and is not out-of-stock at the bundle level. Order-side
 * fan-out into N OrderItem entries + per-member stock decrement lands in
 * S-SBUNI-5; until then the cart write succeeds but the checkout finalize
 * step still treats bundle lines as un-resolvable products. BundleDetailView
 * keeps its "Add to cart coming soon" notice up.
 */
export async function addBundleToCart(
  userId: string,
  bundleSlug: string,
  quantity = 1,
): Promise<CartDocument> {
  if (!bundleSlug?.trim()) {
    throw new ValidationError("bundleSlug is required");
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new ValidationError("quantity must be a positive integer");
  }

  const bundle = await categoriesRepository.findBySlugAndType(
    bundleSlug,
    "bundle",
  );
  if (!bundle) {
    throw new NotFoundError(`Bundle not found: ${bundleSlug}`);
  }
  if (!bundle.bundlePriceInPaise || bundle.bundlePriceInPaise <= 0) {
    throw new ValidationError("Bundle price is not set");
  }
  if (bundle.bundleStockStatus === "out_of_stock") {
    throw new ValidationError("Bundle is out of stock");
  }
  const memberIds = bundle.bundleProductIds ?? [];
  if (memberIds.length === 0) {
    throw new ValidationError("Bundle has no product members configured");
  }

  serverLogger.debug("addBundleToCart", {
    userId,
    bundleSlug,
    quantity,
    memberCount: memberIds.length,
  });

  return cartRepository.addItem(userId, {
    productId: bundle.id,
    productTitle: bundle.name,
    productImage: bundle.display?.coverImage ?? "",
    price: bundle.bundlePriceInPaise,
    currency: "INR",
    quantity,
    storeId: bundle.createdByStoreId ?? "",
    storeName: "",
    listingType: "standard",
    bundleCategorySlug: bundle.slug,
    bundleProductIds: memberIds,
  });
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

    await cartRepository.addItem(userId, {
      productId: product.id,
      productTitle: product.title,
      productImage: product.images?.[0] ?? "",
      price: product.price,
      currency: product.currency ?? getDefaultCurrency(),
      quantity: safeQty,
      storeId: product.storeId,
      storeName: product.storeName ?? "",
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
