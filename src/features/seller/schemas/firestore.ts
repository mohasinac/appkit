/**
 * Offers (Make-an-Offer) Firestore Document Types & Constants
 */

import {
  generateOfferId,
  type GenerateOfferIdInput,
} from "../../../utils/id-generators";

export type OfferStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "countered"
  | "expired"
  | "withdrawn"
  | "paid";

export interface OfferDocument {
  id: string;
  productId: string;
  productTitle: string;
  productSlug?: string;
  productImageUrl?: string;
  buyerUid: string;
  buyerName: string;
  buyerEmail: string;
  sellerId: string;
  sellerName: string;
  offerAmount: number;
  listedPrice: number;
  counterAmount?: number;
  lockedPrice?: number;
  currency: string;
  status: OfferStatus;
  buyerNote?: string;
  sellerNote?: string;
  expiresAt: Date;
  acceptedAt?: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const OFFER_COLLECTION = "offers" as const;

export const OFFER_INDEXED_FIELDS = [
  "buyerUid",
  "sellerId",
  "productId",
  "status",
  "createdAt",
  "expiresAt",
] as const;

export const OFFER_FIELDS = {
  ID: "id",
  PRODUCT_ID: "productId",
  PRODUCT_TITLE: "productTitle",
  BUYER_UID: "buyerUid",
  BUYER_NAME: "buyerName",
  BUYER_EMAIL: "buyerEmail",
  SELLER_ID: "sellerId",
  SELLER_NAME: "sellerName",
  OFFER_AMOUNT: "offerAmount",
  LISTED_PRICE: "listedPrice",
  COUNTER_AMOUNT: "counterAmount",
  LOCKED_PRICE: "lockedPrice",
  CURRENCY: "currency",
  STATUS: "status",
  BUYER_NOTE: "buyerNote",
  SELLER_NOTE: "sellerNote",
  EXPIRES_AT: "expiresAt",
  ACCEPTED_AT: "acceptedAt",
  RESPONDED_AT: "respondedAt",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;

export type OfferCreateInput = Pick<
  OfferDocument,
  | "productId"
  | "productTitle"
  | "productSlug"
  | "productImageUrl"
  | "buyerUid"
  | "buyerName"
  | "buyerEmail"
  | "sellerId"
  | "sellerName"
  | "offerAmount"
  | "listedPrice"
  | "currency"
  | "buyerNote"
>;

export type OfferUpdateInput = Partial<
  Pick<
    OfferDocument,
    | "status"
    | "counterAmount"
    | "lockedPrice"
    | "sellerNote"
    | "acceptedAt"
    | "respondedAt"
    | "updatedAt"
  >
>;

export const offerQueryHelpers = {
  byBuyer: (buyerUid: string) => ["buyerUid", "==", buyerUid] as const,
  bySeller: (sellerId: string) => ["sellerId", "==", sellerId] as const,
  byProduct: (productId: string) => ["productId", "==", productId] as const,
  byStatus: (status: OfferStatus) => ["status", "==", status] as const,
  pending: () => ["status", "==", "pending"] as const,
  expiring: (date: Date) => ["expiresAt", "<=", date] as const,
} as const;

export function createOfferId(input: GenerateOfferIdInput): string {
  return generateOfferId(input);
}
