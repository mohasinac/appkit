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

/** Runtime-accessible offer status values — use instead of bare string literals. */
export const OfferStatusValues = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  COUNTERED: "countered",
  EXPIRED: "expired",
  WITHDRAWN: "withdrawn",
  PAID: "paid",
} as const satisfies Record<string, OfferStatus>;

export interface OfferDocument {
  id: string;
  productId: string;
  productTitle: string;
  productSlug?: string;
  productImageUrl?: string;
  buyerUid: string;
  buyerName: string;
  buyerEmail: string;
  storeId: string;
  storeName: string;
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
  checkoutDeadline?: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const OFFER_COLLECTION = "offers" as const;

export const OFFER_INDEXED_FIELDS = [
  "buyerUid",
  "storeId",
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
  STORE_ID: "storeId",
  STORE_NAME: "storeName",
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
  CHECKOUT_DEADLINE: "checkoutDeadline",
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
  | "storeId"
  | "storeName"
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
  byStore: (storeId: string) => ["storeId", "==", storeId] as const,
  byProduct: (productId: string) => ["productId", "==", productId] as const,
  byStatus: (status: OfferStatus) => ["status", "==", status] as const,
  pending: () => ["status", "==", "pending"] as const,
  expiring: (date: Date) => ["expiresAt", "<=", date] as const,
} as const;

export function createOfferId(input: GenerateOfferIdInput): string {
  return generateOfferId(input);
}
