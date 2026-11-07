import { productRepository } from "../../../../features/products/repository/products.repository";
import {
  isCollectorDropListing,
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
 * Anti-scam guard — once a clearance draw has at least one paid entry, the
 * seller can no longer take it down (unpublish/archive/delete). Prevents a
 * seller from dodging shipment of an expensive won prize by pulling the
 * listing after the fact.
 */
export function assertClearanceNotLocked(
  product: Pick<ProductDocument, "listingType" | "prizeCurrentEntries">,
  action: string,
): void {
  if ((product.listingType ?? "standard") !== "clearance") return;
  if ((product.prizeCurrentEntries ?? 0) <= 0) return;
  throw new ValidationError(
    `This clearance draw has active entries and cannot be ${action} — buyers have already purchased tickets. The draw must run its course.`,
  );
}

/**
 * Anti-scam guard — a won prize item is immutable, and **no seller may set or
 * clear an allocation.**
 *
 * The client editor also locks won rows visually (`ClearanceItemsEditor`'s
 * `locked` state), but that is UI-only; this is the enforcement, and it runs
 * on all three product-update paths (seller action, admin action, API).
 *
 * ## 🛑 Three holes this closes (found auditing 1.35, 2026-11-07)
 *
 * The original guard only compared the DESCRIPTIVE fields of items that were
 * already `isWon` in the stored document. `isWon` and `wonByOrderId` — the
 * allocation itself — were accepted straight from seller input
 * (`prizeDrawItems[].isWon` is `z.boolean()` in the product input schema), and
 * the loop skipped anything it could not match. So a seller could:
 *
 *  1. **Delete a won item.** `if (!incoming) continue` passed a payload that
 *     simply omitted prize #3 — the won prize left the pool entirely, taking
 *     the record of what the buyer was owed with it. This was the worst of the
 *     three, because it looked like the guard's "unchanged" case.
 *  2. **Un-win a won item** by sending `isWon: false`, freeing an
 *     already-allocated prize to be handed to someone else.
 *  3. **Invent a win** by sending `isWon: true` (and any `wonByOrderId`) on an
 *     item the platform never picked — removing it from the RNG's candidate
 *     pool, or making an order appear to have won something it did not.
 *
 * Every one of those defeats the stated purpose of the mechanic: *"no seller
 * can say you got a trash item when in reality you got the prize."* An
 * auditable random allocation is worth nothing if the seller can edit the
 * result afterwards.
 *
 * The allocation engine (`clearanceAssignWinner`) is unaffected: it writes the
 * array through a Firestore transaction on the raw document and never passes
 * through this action layer. This guard therefore constrains exactly the
 * human-reachable paths, which is the intent — the engine is the only writer
 * of `isWon`.
 *
 * ## Compares VALUES, never key presence
 *
 * Same reasoning as `assertCollectorDropTermsMutable`: the seller editor
 * round-trips the whole array, so every save resubmits each item unchanged.
 * Rejecting on presence would make a draw with one won prize entirely
 * unsaveable and the seller could not fix so much as a typo on an unwon row.
 */
export function assertClearanceWonItemsImmutable(
  currentProduct: Pick<ProductDocument, "prizeDrawItems">,
  input: unknown,
): void {
  if (!Array.isArray(input)) return;
  const current = currentProduct.prizeDrawItems ?? [];
  const incomingItems = input as PrizeDrawItem[];

  for (const currentItem of current) {
    if (!currentItem.isWon) continue;
    const incoming = incomingItems.find(
      (it) => it.itemNumber === currentItem.itemNumber,
    );
    /*
     * 🛑 THROW on a missing row, do not `continue`. Omitting a won item is a
     * deletion, and it was the one edit that passed the old guard untouched.
     */
    if (!incoming) {
      throw new ValidationError(
        `Prize #${currentItem.itemNumber} has already been won and cannot be removed from the draw.`,
      );
    }
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
    /*
     * The allocation fields, checked separately from the descriptive ones so
     * the refusal says what was actually attempted. Un-winning or re-pointing
     * a win is tampering with the result, not an edit to a listing.
     */
    if (
      incoming.isWon !== currentItem.isWon ||
      (incoming.wonByOrderId ?? null) !== (currentItem.wonByOrderId ?? null)
    ) {
      throw new ValidationError(
        `Prize #${currentItem.itemNumber} has already been allocated to a buyer. Allocations are recorded by the platform and cannot be changed.`,
      );
    }
  }

  /*
   * 🛑 And the inverse direction: nothing may become won through this path.
   * Only `clearanceAssignWinner` marks a win, so any incoming `isWon: true`
   * on an item the stored document does not already have won is a forged
   * allocation — including on a brand-new item number.
   */
  for (const incoming of incomingItems) {
    if (!incoming.isWon && !incoming.wonByOrderId) continue;
    const stored = current.find((it) => it.itemNumber === incoming.itemNumber);
    if (stored?.isWon) continue; // equality already verified above
    throw new ValidationError(
      `Prize #${incoming.itemNumber} cannot be marked as won. Winners are drawn by the platform, never set by hand.`,
    );
  }
}

/**
 * Anti-scam guard — a collector drop's economic terms (starting bid, reserve, close
 * time) stop being editable the moment a real bid exists. Moving the goalposts
 * under a live bidder is the one collector drop edit that must never pass.
 *
 * 🛑 It compares VALUES, not key presence. The seller editor round-trips the
 * whole draft, so every save resubmits `startingBid` and `collectorDropEndDate`
 * unchanged — rejecting on presence alone would make a live collector drop entirely
 * unsaveable, and the seller could no longer fix so much as a typo.
 */
export function assertCollectorDropTermsMutable(
  existing: Pick<
    ProductDocument,
    "listingType" | "bidsHaveStarted" | "bidCount" | "startingBid" | "reservePrice" | "collectorDropEndDate"
  >,
  input: unknown,
): void {
  if ((existing.listingType ?? "standard") !== "collector-drop") return;
  const bidding = existing.bidsHaveStarted === true || (existing.bidCount ?? 0) > 0;
  if (!bidding) return;
  if (typeof input !== "object" || input === null) return;
  const patch = input as Partial<
    Record<"startingBid" | "reservePrice" | "collectorDropEndDate", string | number | Date | null>
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
    "collectorDropEndDate" in patch &&
    time(patch.collectorDropEndDate) !== time(existing.collectorDropEndDate)
  )
    changed.push("end date");

  if (changed.length > 0) {
    throw new ValidationError(
      `Bidding has already started on this collector drop, so its ${changed.join(" and ")} can no longer be changed. Everything else on the listing is still editable.`,
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

/** Derive effective price (respects currentBid for collector drops, base price otherwise). */
export function effectivePrice(product: ProductDocument): number {
  if (isCollectorDropListing(product) && product.currentBid) return product.currentBid;
  return product.price;
}

/** Compute whether a product is still available for purchase. */
export function isAvailableForPurchase(product: ProductDocument): boolean {
  if (product.status !== "published") return false;
  if (product.isSold) return false;
  if (isCollectorDropListing(product)) {
    const endDate = product.collectorDropEndDate instanceof Date
      ? product.collectorDropEndDate
      : product.collectorDropEndDate ? new Date(product.collectorDropEndDate as unknown as string) : null;
    return endDate ? endDate.getTime() > Date.now() : false;
  }
  if (isPreOrderListing(product)) return true;
  return (product.availableQuantity ?? 0) > 0;
}
