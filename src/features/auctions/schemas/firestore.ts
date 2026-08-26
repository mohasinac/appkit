/**
 * Bids/Auctions Firestore Document Types & Constants
 */

import {
  generateBidId,
  type GenerateBidIdInput,
} from "../../../utils/id-generators";
import type { StatusChangeEntry } from "../../../_internal/shared/history/types";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export type BidStatus =
  | "active"
  | "outbid"
  | "won"
  | "lost"
  | "cancelled"
  /** Won, then the buyer let the 48h payment window lapse. */
  | "forfeited";

/** Runtime-accessible bid status values — use instead of bare string literals. */
export const BidStatusValues = {
  ACTIVE: "active",
  OUTBID: "outbid",
  WON: "won",
  LOST: "lost",
  CANCELLED: "cancelled",
  FORFEITED: "forfeited",
} as const satisfies Record<string, BidStatus>;

export interface BidDocument extends BaseDocument {
  productId: string;
  productTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  bidAmount: number;
  currency: string;
  status: BidStatus;
  isWinning: boolean;
  previousBidAmount?: number;
  bidDate: Date;
  autoMaxBid?: number;
  /**
   * The order this winning bid was settled into. Written by
   * `finalizeLockedLines` once the winner actually pays; absent on a won-but-
   * unpaid bid, which is what lets /user/bids show a "Pay now" CTA rather than
   * a dead status badge.
   */
  orderId?: string;
  /**
   * True when this bid was created by Buy Now rather than by a buyer typing an
   * amount. Its `bidAmount` is the listing's `buyNowPrice`.
   *
   * A buyout bid starts `active` like any other, but is NOT an ordinary bid in
   * two respects and both are load-bearing:
   *  1. **Auction settlement must ignore it.** A pending buyout sits at the BIN
   *     price, so it would otherwise win by default the moment the auction's
   *     clock ran out — awarding the item to someone who explicitly did not
   *     complete their purchase in time.
   *  2. **It never moves `product.currentBid`.** A pending claim is not a
   *     public price, and inflating the visible bid to the BIN price would make
   *     `isBuyNowAvailable` false for everybody else, silently making the
   *     buyout single-occupancy. Concurrency is settled by the transaction in
   *     `claimAuctionForCheckout`, not by blocking the second buyer up front.
   */
  isBuyout?: boolean;

  /**
   * Who changed what, when, and why. See § "Status History" in CLAUDE.md.
   *
   * A bid moves through more states than any other record a buyer owns —
   * active → outbid → active → won → forfeited, or cancelled for a lapsed
   * buyout claim — and every one of those moves happened inside a batch with
   * nothing recording it. "Why does this say forfeited" was unanswerable.
   */
  statusHistory?: StatusChangeEntry[];
  statusHistoryTruncated?: number;
}

export const BID_COLLECTION = "bids" as const;

export const BID_INDEXED_FIELDS = [
  "productId",
  "userId",
  "status",
  "isWinning",
  "bidDate",
  "createdAt",
] as const;

export const DEFAULT_BID_DATA: Partial<BidDocument> = {
  status: "active",
  isWinning: false,
};

export const BID_PUBLIC_FIELDS = [
  "id",
  "productId",
  "productTitle",
  "userName",
  "bidAmount",
  "currency",
  "bidDate",
  "isWinning",
  "createdAt",
] as const;

export const BID_UPDATABLE_FIELDS = ["autoMaxBid"] as const;

export type BidCreateInput = Omit<
  BidDocument,
  "id" | "createdAt" | "updatedAt" | "status" | "isWinning"
>;
export type BidUpdateInput = Partial<
  Pick<BidDocument, (typeof BID_UPDATABLE_FIELDS)[number]>
>;
export type BidAdminUpdateInput = Partial<
  Omit<BidDocument, "id" | "createdAt">
>;

export const bidQueryHelpers = {
  byProduct: (productId: string) => ["productId", "==", productId] as const,
  byUser: (userId: string) => ["userId", "==", userId] as const,
  byStatus: (status: BidStatus) => ["status", "==", status] as const,
  winning: (productId: string) =>
    [
      ["productId", "==", productId],
      ["isWinning", "==", true],
    ] as const,
  active: () => ["status", "==", "active"] as const,
} as const;

export function createBidId(
  input: Omit<GenerateBidIdInput, "random"> & { random?: string },
): string {
  return generateBidId(input as GenerateBidIdInput);
}


/**
 * The fields whose changes earn a timeline entry.
 *
 * `bidAmount` is included because a proxy bid raises it in place, so the
 * timeline is the only record of what the bidder actually committed at each
 * step. `previousBidAmount` is excluded — it is the same information one
 * entry earlier.
 */
export const BID_TRACKED_FIELDS = [
  "status",
  "isWinning",
  "bidAmount",
  "orderId",
] as const;

/**
 * PII on this document, for `withHistory`'s scrub. `userName` and `userEmail`
 * are denormalised onto every bid, so a diff of an unrelated field would drag
 * them into an array `encryptPiiFields` cannot descend into — the exact leak
 * the primitive's `piiFields` exists to prevent.
 */
export const BID_HISTORY_PII_FIELDS = ["userName", "userEmail"] as const;
