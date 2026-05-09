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

export async function getPublicUserProfile(
  userId: string,
): Promise<Pick<
  UserDocument,
  | "id"
  | "displayName"
  | "photoURL"
  | "role"
  | "createdAt"
  | "storeId"
  | "storeSlug"
  | "publicProfile"
  | "stats"
> | null> {
  const user = await userRepository.findById(userId);
  if (!user) return null;
  return {
    id: user.id,
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
    images: r.images?.map((url) => ({ url })),
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

export async function getSellerProducts(sellerId: string) {
  const products = await productRepository.findBySeller(sellerId);
  return products.filter((p) => p.status === ProductStatusValues.PUBLISHED);
}
