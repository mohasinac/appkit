/**
 * Profile Domain Actions (appkit)
 *
 * Pure business functions for profile CRUD, seller stats, and session reads.
 * Auth, rate-limiting, and Next.js specifics are handled by the consumer.
 */

import { maskPublicReview } from "../../../security";
import { finalizeStagedMediaField } from "../../media";
import { userRepository } from "../repository/user.repository";
import { sessionRepository } from "../repository/session.repository";
import { productRepository } from "../../products/repository/products.repository";
import { reviewRepository } from "../../reviews/repository/reviews.repository";
import type { UserDocument } from "../schemas";

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
  "id" | "displayName" | "photoURL" | "role" | "createdAt"
> | null> {
  const user = await userRepository.findById(userId);
  if (!user) return null;
  return {
    id: user.id,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function getSellerReviews(sellerId: string) {
  const products = await productRepository.findBySeller(sellerId);
  const published = products.filter((p) => p.status === "published");
  if (published.length === 0) return [];
  const batches = await Promise.all(
    published
      .slice(0, 20)
      .map((p) => reviewRepository.findApprovedByProduct(p.id).catch(() => [])),
  );
  return batches.flat().map(maskPublicReview);
}

export async function getSellerProducts(sellerId: string) {
  const products = await productRepository.findBySeller(sellerId);
  return products.filter((p) => p.status === "published");
}
