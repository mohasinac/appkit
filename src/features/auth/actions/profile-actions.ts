/**
 * Profile Domain Actions (appkit)
 *
 * Pure business functions for profile CRUD, seller stats, and session reads.
 * Auth, rate-limiting, and Next.js specifics are handled by the consumer.
 */

import { maskPublicReview } from "../../../security";
import { finalizeStagedMediaField } from "../../media/finalize";
import { userRepository } from "../repository/user.repository";
import { sessionRepository } from "../repository/session.repository";
import { productRepository } from "../../products/repository/products.repository";
import { ProductStatusValues } from "../../products/schemas";
import { reviewRepository } from "../../reviews/repository/reviews.repository";
import type { UserDocument } from "../schemas";
import type { Review } from "../../reviews/types";

export type UpdateProfileInput = {
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
  avatarMetadata?: {
    url: string;
    position: { x: number; y: number };
    zoom: number;
  };
};

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserDocument> {
  const finalPhotoURL = await finalizeStagedMediaField(input.photoURL);
  const data =
    finalPhotoURL !== undefined ? { ...input, photoURL: finalPhotoURL } : input;
  return userRepository.updateProfileWithVerificationReset(userId, data);
}

export async function getUserProfile(
  userId: string,
): Promise<UserDocument | null> {
  return userRepository.findById(userId);
}

export async function getUserSessions(userId: string) {
  return sessionRepository.findAllByUser(userId);
}

/**
 * Resolve a profile by slug, then document id, then Auth uid.
 *
 * ONE function because the page and `GET /api/profile/[userId]` had already
 * diverged: the page fell back to `findByUid`, the route did not, so the same
 * identifier resolved on one surface and 404'd on the other. Adding slug
 * resolution to each of them separately would have made that three variants.
 *
 * Order matters. The slug is the canonical public identifier, so it is tried
 * first; `id` is next because for every app-created account `id === uid`, which
 * makes the third lookup a no-op for them. The uid fallback exists for seeded
 * personas (whose document id is a `user-*` slug, not their uid) and for links
 * shared before slugs existed — dropping it would 404 URLs already in the wild,
 * including ones inside sent notification emails.
 */
export async function resolveProfileUser(
  identifier: string,
): Promise<UserDocument | null> {
  const bySlug = await userRepository.findBySlug(identifier);
  if (bySlug) return bySlug;
  const byId = await userRepository.findById(identifier);
  if (byId) return byId;
  return userRepository.findByUid(identifier);
}

export async function getPublicUserProfile(
  userId: string,
): Promise<Pick<
  UserDocument,
  | "id"
  | "slug"
  | "displayName"
  | "photoURL"
  | "role"
  | "createdAt"
  | "storeId"
  | "storeSlug"
  | "publicProfile"
  | "stats"
> | null> {
  const user = await resolveProfileUser(userId);
  if (!user) return null;
  return {
    id: user.id,
    slug: user.slug,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: user.role,
    createdAt: user.createdAt,
    storeId: user.storeId,
    storeSlug: user.storeSlug,
    publicProfile: user.publicProfile,
    stats: user.stats,
  };
}

/** Fetch approved reviews for a store. storeId === storeSlug in this project. */
export async function getSellerReviews(storeId: string) {
  const snapshot = await reviewRepository.findApprovedByStore(storeId).catch(() => []);
  return snapshot.map((r): Review => ({
    id: r.id,
    productId: r.productId,
    productTitle: r.productTitle,
    userId: r.userId,
    userName: maskPublicReview(r).userName,
    userAvatar: r.userAvatar,
    rating: r.rating as Review["rating"],
    title: r.title,
    comment: r.comment,
    images: r.images,
    status: r.status,
    helpfulCount: r.helpfulCount,
    reportCount: r.reportCount,
    verified: r.verified,
    featured: r.featured,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : undefined,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : undefined,
    storeSlug: r.storeId,
    storeName: r.storeName,
  }));
}

export async function getProfileStoreProducts(storeId: string) {
  const products = await productRepository.findByStore(storeId);
  return products.filter((p) => p.status === ProductStatusValues.PUBLISHED);
}

/** Approved product reviews written by this user as a buyer. Excludes seller→buyer ratings. */
export async function getReviewsAuthoredBy(userId: string) {
  const all = await reviewRepository.findApprovedByUser(userId).catch(() => []);
  // reviewerRole:"seller" means this user rated a buyer — not a product review
  const snapshot = all.filter((r) => r.reviewerRole !== "seller");
  return snapshot.map((r): Review => ({
    id: r.id,
    productId: r.productId,
    productTitle: r.productTitle,
    userId: r.userId,
    userName: maskPublicReview(r).userName,
    userAvatar: r.userAvatar,
    rating: r.rating as Review["rating"],
    title: r.title,
    comment: r.comment,
    images: r.images,
    status: r.status,
    helpfulCount: r.helpfulCount,
    reportCount: r.reportCount,
    verified: r.verified,
    featured: r.featured,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : undefined,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : undefined,
    storeSlug: r.storeId,
    storeName: r.storeName,
  }));
}

/** Approved seller→buyer reviews received by this buyer. */
export async function getReviewsReceivedBy(userId: string) {
  const snapshot = await reviewRepository.findByReviewee(userId).catch(() => []);
  return snapshot.map((r): Review => ({
    id: r.id,
    productId: r.productId,
    productTitle: r.productTitle,
    userId: r.userId,
    userName: maskPublicReview(r).userName,
    userAvatar: r.userAvatar,
    rating: r.rating as Review["rating"],
    title: r.title,
    comment: r.comment,
    images: r.images,
    status: r.status,
    helpfulCount: r.helpfulCount,
    reportCount: r.reportCount,
    verified: r.verified,
    featured: r.featured,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : undefined,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : undefined,
    storeSlug: r.storeId,
    storeName: r.storeName,
  }));
}
