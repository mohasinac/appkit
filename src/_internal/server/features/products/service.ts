import { productRepository } from "../../../../repositories";
import {
  isAuctionListing,
  isPreOrderListing,
} from "../../../../features/products/utils/listing-type";
import {
  ProductNotFoundError,
  ProductOwnershipError,
  ProductStatusError,
  ProductStockError,
} from "../../../shared/features/products/errors";
import type { ProductDocument } from "../../../shared/features/products/types";

const ALLOWED_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  draft:        ["published", "archived"],
  published:    ["archived", "draft"],
  archived:     ["draft"],
  sold:         [],
  out_of_stock: ["published", "archived"],
  discontinued: [],
};

/** Assert a product exists and belongs to the given seller. Throws on failure. */
export async function assertProductOwnership(
  productId: string,
  sellerId: string,
): Promise<ProductDocument> {
  const product = await productRepository.findById(productId).catch(() => null);
  if (!product) throw new ProductNotFoundError(productId);
  if (product.storeId !== sellerId) throw new ProductOwnershipError(productId);
  return product;
}

/** Validate that a status transition is allowed. */
export function assertStatusTransition(from: string, to: string): void {
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new ProductStatusError(from, to);
  }
}

/** Assert the product has available stock for a purchase. */
export function assertInStock(product: ProductDocument, quantity = 1): void {
  if ((product.availableQuantity ?? 0) < quantity) {
    throw new ProductStockError(
      `Requested quantity ${quantity} exceeds available stock ${product.availableQuantity ?? 0}`,
    );
  }
}

/** Derive effective price (respects currentBid for auctions, base price otherwise). */
export function effectivePrice(product: ProductDocument): number {
  if (isAuctionListing(product) && product.currentBid) return product.currentBid;
  return product.price;
}

/** Compute whether a product is still available for purchase. */
export function isAvailableForPurchase(product: ProductDocument): boolean {
  if (product.status !== "published") return false;
  if (product.isSold) return false;
  if (isAuctionListing(product)) {
    const endDate = product.auctionEndDate instanceof Date
      ? product.auctionEndDate
      // audit-unknown-ok: TS structural escape — primitive cast
      : product.auctionEndDate ? new Date(product.auctionEndDate as unknown as string) : null;
    return endDate ? endDate.getTime() > Date.now() : false;
  }
  if (isPreOrderListing(product)) return true;
  return (product.availableQuantity ?? 0) > 0;
}
