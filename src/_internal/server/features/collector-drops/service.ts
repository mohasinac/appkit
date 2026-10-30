import { productRepository } from "../../../../features/products/repository/products.repository";

import { isCollectorDropListing } from "../../../../features/products/utils/listing-type";
import {
  CollectorDropNotFoundError,
  CollectorDropEndedError,
  BidTooLowError,
  BidOnOwnCollectorDropError,
} from "../../../shared/features/collector-drops/errors";
import {
  COLLECTOR_DROP_SNIPING_WINDOW_SECONDS,
  COLLECTOR_DROP_DEFAULT_EXTENSION_MINUTES,
  resolveMinBid,
  type BidIncrementTier,
} from "../../../shared/features/collector-drops/config";
import type { ProductDocument } from "../../../shared/features/products/types";

/** Assert a collector drop exists, is published, and is still active. Returns the product. */
export async function assertCollectorDropActive(collectorDropId: string): Promise<ProductDocument> {
  const product = await productRepository.findByIdOrSlug(collectorDropId);
  if (!product || !isCollectorDropListing(product)) throw new CollectorDropNotFoundError(collectorDropId);

  const endDate = product.collectorDropEndDate instanceof Date
    ? product.collectorDropEndDate
    : product.collectorDropEndDate
      ? new Date(product.collectorDropEndDate as unknown as string)
      : null;

  if (!endDate || endDate.getTime() <= Date.now()) throw new CollectorDropEndedError(collectorDropId);
  return product as unknown as ProductDocument;
}

/**
 * Compute the minimum valid bid given the current state and the admin's tier table.
 *
 * Delegates to the shared `resolveMinBid` so this path can't drift from
 * `placeBid`'s — including the no-bids case, where the starting bid is itself
 * acceptable rather than needing to be beaten by an increment.
 */
export function computeMinBid(product: ProductDocument, tiers: BidIncrementTier[]): number {
  const hasBids =
    ((product as any).currentBid ?? 0) > 0 || ((product as any).bidCount ?? 0) > 0;
  const current = hasBids
    ? ((product as any).currentBid ?? (product as any).startingBid ?? 0)
    : ((product as any).startingBid ?? 0);
  return resolveMinBid(current, tiers, (product as any).minBidIncrement, { hasBids });
}

/** Assert a bid amount is valid against the current collector drop state. */
export function assertBidAmount(product: ProductDocument, amount: number, tiers: BidIncrementTier[]): void {
  const minBid = computeMinBid(product, tiers);
  if (amount < minBid) throw new BidTooLowError(minBid);
}

/** Assert the bidder is not the collector drop owner. */
export function assertNotCollectorDropOwner(product: ProductDocument, bidderId: string): void {
  if (product.storeId === bidderId) throw new BidOnOwnCollectorDropError();
}

/** Return true if the bid was placed within the sniping window and the collector drop should auto-extend. */
export function shouldAutoExtend(product: ProductDocument): boolean {
  if (!(product as any).autoExtendable) return false;
  const endDate = (product as any).collectorDropEndDate instanceof Date
    ? (product as any).collectorDropEndDate
    : (product as any).collectorDropEndDate
      ? new Date((product as any).collectorDropEndDate as unknown as string)
      : null;
  if (!endDate) return false;
  const secondsLeft = (endDate.getTime() - Date.now()) / 1000;
  return secondsLeft <= COLLECTOR_DROP_SNIPING_WINDOW_SECONDS;
}

/** Compute the extended end date. */
export function computeExtendedEndDate(product: ProductDocument): Date {
  const current = (product as any).collectorDropEndDate instanceof Date
    ? (product as any).collectorDropEndDate
    : new Date((product as any).collectorDropEndDate as unknown as string);
  const extensionMs = ((product as any).collectorDropExtensionMinutes ?? COLLECTOR_DROP_DEFAULT_EXTENSION_MINUTES) * 60 * 1000;
  return new Date(current.getTime() + extensionMs);
}
