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
import { ValidationError } from "../../../shared/errors/index";
import type { ProductDocument } from "../../../shared/features/products/types";
import type { PrizeDrawItem } from "../../../../features/products/schemas/firestore";

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
  const product = await productRepository.findById(productId);
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

/**
 * Anti-scam guard — once a prize draw has at least one paid entry, the
 * seller can no longer take it down (unpublish/archive/delete). Prevents a
 * seller from dodging shipment of an expensive won prize by pulling the
 * listing after the fact.
 */
export function assertPrizeDrawNotLocked(
  product: Pick<ProductDocument, "listingType" | "prizeCurrentEntries">,
  action: string,
): void {
  if ((product.listingType ?? "standard") !== "prize-draw") return;
  if ((product.prizeCurrentEntries ?? 0) <= 0) return;
  throw new ValidationError(
    `This prize draw has active entries and cannot be ${action} — buyers have already purchased tickets. The draw must run its course.`,
  );
}

/**
 * Anti-scam guard — once a prize item has been won, its title/images/
 * description/condition/estimatedValue become immutable server-side (the
 * client editor already locks this visually via PrizeDrawItemsEditor's
 * `locked` state, but that's UI-only — this is the enforcement). Prevents a
 * seller from swapping in a cheaper item after a buyer has already won.
 */
export function assertPrizeDrawWonItemsImmutable(
  currentProduct: Pick<ProductDocument, "prizeDrawItems">,
  input: unknown,
): void {
  if (!Array.isArray(input)) return;
  const current = currentProduct.prizeDrawItems ?? [];
  for (const currentItem of current) {
    if (!currentItem.isWon) continue;
    const incoming = (input as PrizeDrawItem[]).find(
      (it) => it.itemNumber === currentItem.itemNumber,
    );
    if (!incoming) continue;
    const changed =
      incoming.title !== currentItem.title ||
      incoming.description !== currentItem.description ||
      incoming.condition !== currentItem.condition ||
      incoming.estimatedValue !== currentItem.estimatedValue ||
      JSON.stringify(incoming.images) !== JSON.stringify(currentItem.images);
    if (changed) {
      throw new ValidationError(
        `Prize #${currentItem.itemNumber} has already been won and can no longer be edited.`,
      );
    }
  }
}

/**
 * Anti-scam guard — an auction's economic terms (starting bid, reserve, close
 * time) stop being editable the moment a real bid exists. Moving the goalposts
 * under a live bidder is the one auction edit that must never pass.
 *
 * 🛑 It compares VALUES, not key presence. The seller editor round-trips the
 * whole draft, so every save resubmits `startingBid` and `auctionEndDate`
 * unchanged — rejecting on presence alone would make a live auction entirely
 * unsaveable, and the seller could no longer fix so much as a typo.
 */
export function assertAuctionTermsMutable(
  existing: Pick<
    ProductDocument,
    "listingType" | "bidsHaveStarted" | "bidCount" | "startingBid" | "reservePrice" | "auctionEndDate"
  >,
  input: unknown,
): void {
  if ((existing.listingType ?? "standard") !== "auction") return;
  const bidding = existing.bidsHaveStarted === true || (existing.bidCount ?? 0) > 0;
  if (!bidding) return;
  if (typeof input !== "object" || input === null) return;
  const patch = input as Partial<
    Record<"startingBid" | "reservePrice" | "auctionEndDate", string | number | Date | null>
  >;

  const time = (v: unknown): number | null => {
    if (v == null) return null;
    const d = v instanceof Date ? v : new Date(v as string | number);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  };

  const changed: string[] = [];
  if ("startingBid" in patch && patch.startingBid !== existing.startingBid)
    changed.push("starting bid");
  if ("reservePrice" in patch && patch.reservePrice !== existing.reservePrice)
    changed.push("reserve price");
  if (
    "auctionEndDate" in patch &&
    time(patch.auctionEndDate) !== time(existing.auctionEndDate)
  )
    changed.push("end date");

  if (changed.length > 0) {
    throw new ValidationError(
      `Bidding has already started on this auction, so its ${changed.join(" and ")} can no longer be changed. Everything else on the listing is still editable.`,
    );
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
      : product.auctionEndDate ? new Date(product.auctionEndDate as unknown as string) : null;
    return endDate ? endDate.getTime() > Date.now() : false;
  }
  if (isPreOrderListing(product)) return true;
  return (product.availableQuantity ?? 0) > 0;
}
