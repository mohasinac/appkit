import { productRepository } from "../../../../repositories";
import { bidRepository } from "../../../../repositories";
import { isAuctionListing } from "../../../../features/products/utils/listing-type";
import {
  AuctionNotFoundError,
  AuctionEndedError,
  BidTooLowError,
  BidOnOwnAuctionError,
} from "../../../shared/features/auctions/errors";
import {
  AUCTION_MIN_BID_INCREMENT_PAISE,
  AUCTION_SNIPING_WINDOW_SECONDS,
  AUCTION_DEFAULT_EXTENSION_MINUTES,
} from "../../../shared/features/auctions/config";
import type { ProductDocument } from "../../../shared/features/products/types";

/** Assert an auction exists, is published, and is still active. Returns the product. */
export async function assertAuctionActive(auctionId: string): Promise<ProductDocument> {
  const product = await productRepository.findByIdOrSlug(auctionId).catch(() => null);
  if (!product || !isAuctionListing(product)) throw new AuctionNotFoundError(auctionId);

  const endDate = product.auctionEndDate instanceof Date
    ? product.auctionEndDate
    : product.auctionEndDate
      ? new Date(product.auctionEndDate as unknown as string)
      : null;

  if (!endDate || endDate.getTime() <= Date.now()) throw new AuctionEndedError(auctionId);
  return product as unknown as ProductDocument;
}

/** Compute the minimum valid bid given the current state. */
export function computeMinBid(product: ProductDocument): number {
  const current = (product as any).currentBid ?? (product as any).startingBid ?? 0;
  const increment = (product as any).minBidIncrement ?? AUCTION_MIN_BID_INCREMENT_PAISE;
  return current + increment;
}

/** Assert a bid amount is valid against the current auction state. */
export function assertBidAmount(product: ProductDocument, amount: number): void {
  const minBid = computeMinBid(product);
  if (amount < minBid) throw new BidTooLowError(minBid);
}

/** Assert the bidder is not the auction owner. */
export function assertNotAuctionOwner(product: ProductDocument, bidderId: string): void {
  if (product.storeId === bidderId) throw new BidOnOwnAuctionError();
}

/** Return true if the bid was placed within the sniping window and the auction should auto-extend. */
export function shouldAutoExtend(product: ProductDocument): boolean {
  if (!(product as any).autoExtendable) return false;
  const endDate = (product as any).auctionEndDate instanceof Date
    ? (product as any).auctionEndDate
    : (product as any).auctionEndDate
      ? new Date((product as any).auctionEndDate as unknown as string)
      : null;
  if (!endDate) return false;
  const secondsLeft = (endDate.getTime() - Date.now()) / 1000;
  return secondsLeft <= AUCTION_SNIPING_WINDOW_SECONDS;
}

/** Compute the extended end date. */
export function computeExtendedEndDate(product: ProductDocument): Date {
  const current = (product as any).auctionEndDate instanceof Date
    ? (product as any).auctionEndDate
    : new Date((product as any).auctionEndDate as unknown as string);
  const extensionMs = ((product as any).auctionExtensionMinutes ?? AUCTION_DEFAULT_EXTENSION_MINUTES) * 60 * 1000;
  return new Date(current.getTime() + extensionMs);
}
