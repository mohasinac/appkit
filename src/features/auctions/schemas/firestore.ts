/**
 * Bids/Auctions Firestore Document Types & Constants
 */

import {
  generateBidId,
  type GenerateBidIdInput,
} from "../../../utils/id-generators";

export type BidStatus = "active" | "outbid" | "won" | "lost" | "cancelled";

/** Runtime-accessible bid status values — use instead of bare string literals. */
export const BidStatusValues = {
  ACTIVE: "active",
  OUTBID: "outbid",
  WON: "won",
  LOST: "lost",
  CANCELLED: "cancelled",
} as const satisfies Record<string, BidStatus>;

export interface BidDocument {
  id: string;
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
  createdAt: Date;
  updatedAt: Date;
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
