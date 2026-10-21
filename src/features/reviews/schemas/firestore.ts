/**
 * Reviews Firestore Document Types & Constants
 */

import { generateReviewId } from "../../../utils/id-generators";
import type { ReviewStatus } from "../types";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { ListingType } from "../../products/types/index";
import type { Encrypted, Plaintext } from "../../../security/encrypted";

/** Runtime-accessible review status values — use instead of bare string literals. */
export const ReviewStatusValues = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const satisfies Record<string, ReviewStatus>;

export interface ReviewVideoField {
  url: string;
  thumbnailUrl: string;
  duration: number;
  trimStart?: number;
  trimEnd?: number;
}

/**
 * `ReviewDocument` with its PII as plain `string` — what the named repository
 * accessors return, and what a WRITE path accepts (the repository encrypts).
 *
 * `Plaintext<T>` is the one definition of this shape; see `security/encrypted.ts`.
 * It is deliberately NOT distinguishable from a MASKED value — `maskPii`
 * returns plain strings too, and no type can express "these characters are
 * asterisks". The distinction is which named method you called.
 */
export type ReviewPlain = Plaintext<ReviewDocument>;

export interface ReviewDocument extends BaseDocument {
  /** Normalized edge-n-gram search field — see appkit/src/utils/search-txt.ts. */
  searchTxt?: string[];

  productId: string;
  productTitle: string;
  /** Denormalized from the product at review-creation time — drives the correct detail-page link (e.g. prize-draw items link to /prize-draws/[slug], not /products/[slug]). */
  listingType?: ListingType;
  storeId?: string;
  storeName?: string;
  userId: string;
  /** Firestore document ID of the reviewer (slug like `user-mohsin-c`). Populated on create; used to build profile links. */
  userSlug?: string;
  userName: Encrypted<string>;
  userAvatar?: string;
  /*
   * ── PER-ITEM RATING, ZOMATO-STYLE (owner's requirement, 2026-10-21) ───────
   *
   * *"like in zomato, each item of the order can be individually rated and a
   * comment can be given — use that."*
   *
   * `ReviewDocument` was ALREADY per-product (`productId` + `rating` +
   * `comment`), so the shape needed no change — what it lacked was any link
   * back to the ORDER. Measured: there is no `orderId` anywhere on this
   * document, and `isVerifiedPurchase` is **read in two places and written by
   * nothing**, so a review has never been attributable to a purchase at all.
   *
   * That gap is what made the owner's completion rule unanswerable: *"if review
   * is given and order marked complete by the buyer — immediate disburse"*
   * requires knowing whether THIS order's items were rated, and nothing
   * connected the two.
   */

  /**
   * The order whose line this review rates.
   *
   * 🛑 Optional, because every review written before this field existed has
   * none — and any query over it must therefore treat a missing `orderId` as
   * "unknown", never as "not from an order". A default-exclusive filter would
   * hide every pre-existing review and manufacture a backfill nobody budgeted
   * for (the same rule `serverErrors.entityType` carries).
   */
  orderId?: string;
  /**
   * The specific order LINE, when the order carries `items[]`.
   *
   * Needed because one order can contain the same `productId` twice — a
   * grouped line and a standalone purchase of the same bey — and Zomato-style
   * rating is per LINE, not per product. Without it, rating one of the two
   * lines would mark both as rated.
   */
  orderItemId?: string;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  /** Denormalized flag — true when images array is non-empty. Enables hasImages==true Firestore query. */
  hasImages?: boolean;
  video?: ReviewVideoField;
  status: ReviewStatus;
  moderatorId?: string;
  moderatorNote?: string;
  rejectionReason?: string;
  helpfulCount: number;
  /**
   * UIDs that have voted this review helpful. Server-side idempotency for
   * POST /api/reviews/[id]/vote — the client's localStorage guard is advisory
   * only and cannot stop a repeated POST. Never returned to the public.
   */
  helpfulVoterIds?: string[];
  reportCount: number;
  verified: boolean;
  featured?: boolean;
  isAnonymous?: boolean;
  sellerReply?: string;
  sellerRepliedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  /** Set only on seller→buyer reviews. The userId of the buyer being reviewed. */
  revieweeId?: string;
  /** Absent on legacy docs = "buyer". Distinguishes seller→buyer reviews from buyer→product reviews. */
  reviewerRole?: "buyer" | "seller";
}

export const REVIEW_COLLECTION = "reviews" as const;

export const REVIEW_INDEXED_FIELDS = [
  "searchTxt",
  "productId",
  "storeId",
  "userId",
  "revieweeId",
  "reviewerRole",
  "status",
  "rating",
  "verified",
  "featured",
  "createdAt",
] as const;

export const DEFAULT_REVIEW_DATA: Partial<ReviewDocument> = {
  status: "pending",
  helpfulCount: 0,
  reportCount: 0,
  verified: false,
  images: [],
};

export const REVIEW_PUBLIC_FIELDS = [
  "id",
  "productId",
  "userName",
  "userAvatar",
  "rating",
  "title",
  "comment",
  "helpfulCount",
  "verified",
  "images",
  "createdAt",
] as const;

export const REVIEW_UPDATABLE_FIELDS = [
  "rating",
  "title",
  "comment",
  "images",
] as const;

/*
 * 🛑 Derived from the PLAIN shape. The caller holds a real name/email and the
 * repository encrypts on write; deriving from the document would demand
 * `Encrypted<string>` nobody has, and `asEncrypted(value)` to satisfy it is
 * the misuse that helper's docstring forbids.
 */
export type ReviewCreateInput = Omit<
  ReviewPlain,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "helpfulCount"
  | "reportCount"
  | "moderatorId"
  | "moderatorNote"
  | "approvedAt"
  | "rejectedAt"
>;

export type ReviewUpdateInput = Partial<
  Pick<ReviewDocument, (typeof REVIEW_UPDATABLE_FIELDS)[number]>
>;

export type ReviewModerationInput = {
  status: ReviewStatus;
  moderatorId: string;
  moderatorNote?: string;
  rejectionReason?: string;
};

export const reviewQueryHelpers = {
  byProduct: (productId: string) => ["productId", "==", productId] as const,
  byUser: (userId: string) => ["userId", "==", userId] as const,
  byStatus: (status: ReviewStatus) => ["status", "==", status] as const,
  approved: () => ["status", "==", "approved"] as const,
  pending: () => ["status", "==", "pending"] as const,
  verified: () => ["verified", "==", true] as const,
  byRating: (rating: number) => ["rating", "==", rating] as const,
  highRated: () => ["rating", ">=", 4] as const,
} as const;

export function createReviewId(
  productName: string,
  userFirstName: string,
  date?: Date,
): string {
  return generateReviewId({ productName, userFirstName, date });
}
