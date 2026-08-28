/**
 * Offers (Make-an-Offer) Firestore Document Types & Constants
 */

import {
  generateOfferId,
  type GenerateOfferIdInput,
} from "../../../utils/id-generators";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { StatusChangeEntry } from "../../../_internal/shared/history/index";

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

export interface OfferDocument extends BaseDocument {
  /** Word-prefix search tokens. Derived on write; never fed by a PII field. */
  searchTxt?: string[];
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
  /** Set by `markPaid` once the buyer's order exists — makes "paid" auditable. */
  paidOrderId?: string;
  paidAt?: Date;

  // ── Negotiation history + chain (W2) ────────────────────────────────────
  /**
   * Append-only delta log — the canonical record of when things happened to
   * this offer. Shares `StatusChangeEntry` with `OrderDocument`; an offer is
   * an order with more phases in front of it.
   *
   * `respondedAt` is deliberately kept but NOT extended: it means four
   * different events (seller-accept, seller-decline, seller-counter,
   * buyer-withdraw) and survives only as the legacy fallback for offers
   * written before this field existed.
   */
  statusHistory?: StatusChangeEntry[];
  /** Entries dropped off the front — so the UI never implies "this is all of it". */
  statusHistoryTruncated?: number;

  /**
   * The multi-round chain. A counter-offer is a NEW document, so without
   * these three a three-round negotiation is three unrelated records —
   * which is what it is today: `previousOfferId` currently exists only
   * inside a `serverLogger.info` call and never reaches Firestore.
   */
  previousOfferId?: string;
  supersededByOfferId?: string;
  /**
   * Denormalised root of the chain (the root stores its own id) so a list row
   * renders "Round 2" with ZERO extra reads, and `findChain` is a single-field
   * equality served by the automatic index — no composite index needed.
   */
  chainRootOfferId?: string;
  /** 1-based. Absent means round 1. */
  counterRound?: number;

  /**
   * Admin escalation. The store keeps sole authority to accept/counter/
   * decline; an admin may only cancel, with a reason, and it is recorded
   * here as well as in `adminAuditLog`.
   */
  cancelledByAdminUid?: string;
  cancelReason?: string;
}

/**
 * Fields whose changes are recorded in an offer's `statusHistory`.
 *
 * Excludes `buyerName`/`buyerEmail` (PII — `encryptPiiFields` never descends
 * into arrays, so they would persist in plaintext inside the history),
 * `buyerNote`/`sellerNote` (they ride in the entry's `note`), and
 * `updatedAt`/`respondedAt` (noise that would burn the FIFO cap).
 */
export const OFFER_TRACKED_FIELDS = [
  "status",
  "offerAmount",
  "counterAmount",
  "lockedPrice",
  "checkoutDeadline",
  "paidOrderId",
  "supersededByOfferId",
  "previousOfferId",
] as const;

export const OFFER_COLLECTION = "offers" as const;

export const OFFER_INDEXED_FIELDS = [
  "searchTxt",
  "buyerUid",
  "storeId",
  "productId",
  "status",
  "createdAt",
  "expiresAt",
  "checkoutDeadline",
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
  PAID_ORDER_ID: "paidOrderId",
  PAID_AT: "paidAt",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  // Negotiation history + chain (W2)
  STATUS_HISTORY: "statusHistory",
  STATUS_HISTORY_TRUNCATED: "statusHistoryTruncated",
  PREVIOUS_OFFER_ID: "previousOfferId",
  SUPERSEDED_BY_OFFER_ID: "supersededByOfferId",
  CHAIN_ROOT_OFFER_ID: "chainRootOfferId",
  COUNTER_ROUND: "counterRound",
  CANCELLED_BY_ADMIN_UID: "cancelledByAdminUid",
  CANCEL_REASON: "cancelReason",
  /** Word-prefix n-grams for `array-contains` search. Derived by `buildOfferSearchTxt`. */
  SEARCH_TXT: "searchTxt",
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
  // Chain linkage, set by counterOfferByBuyer when this is round N>1.
  // `statusHistory` is deliberately absent — the repository seeds it, so
  // there is exactly one writer. `sellerNote` is absent too: carrying round
  // N-1's note onto round N would render as "Seller note" on the current
  // round, making the seller look like they answered a counter they have
  // never seen. The previous round's document still holds it.
  | "previousOfferId"
  | "chainRootOfferId"
  | "counterRound"
>;

export type OfferUpdateInput = Partial<
  Pick<
    OfferDocument,
    | "status"
    | "counterAmount"
    | "lockedPrice"
    | "sellerNote"
    | "acceptedAt"
    | "checkoutDeadline"
    | "respondedAt"
    | "paidOrderId"
    | "paidAt"
    | "updatedAt"
    | "statusHistory"
    | "statusHistoryTruncated"
    | "supersededByOfferId"
    | "cancelledByAdminUid"
    | "cancelReason"
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
