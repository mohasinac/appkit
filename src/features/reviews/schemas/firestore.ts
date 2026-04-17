/**
 * Reviews Firestore Document Types & Constants
 */

import { generateReviewId } from "../../../utils/id-generators";
import type { ReviewStatus } from "../types";

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

export interface ReviewDocument {
  id: string;
  productId: string;
  productTitle: string;
  sellerId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  video?: ReviewVideoField;
  status: ReviewStatus;
  moderatorId?: string;
  moderatorNote?: string;
  rejectionReason?: string;
  helpfulCount: number;
  reportCount: number;
  verified: boolean;
  featured?: boolean;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
}

export const REVIEW_COLLECTION = "reviews" as const;

export const REVIEW_INDEXED_FIELDS = [
  "productId",
  "userId",
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

export type ReviewCreateInput = Omit<
  ReviewDocument,
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
