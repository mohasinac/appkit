/**
 * Reviews Domain Actions (appkit)
 *
 * Pure business functions for review create/update/delete/vote and query flows.
 * Auth and rate-limit stay in consumer server-action wrappers.
 */

import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../../../errors";
import { serverLogger } from "../../../monitoring";
import { maskPublicReview } from "../../../security";
import { finalizeStagedMediaArray, finalizeStagedMediaUrl } from "../../media";
import { reviewRepository } from "../repository/reviews.repository";
import { productRepository } from "../../products";
import { userRepository } from "../../auth";
import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";
import type { ReviewDocument } from "../schemas";

export interface CreateReviewActionInput {
  productId: string;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  videoUrl?: string;
}

export interface UpdateReviewActionInput {
  rating?: number;
  title?: string;
  comment?: string;
  status?: "pending" | "approved" | "rejected";
  images?: string[];
  videoUrl?: string | null;
}

export async function createReview(
  userId: string,
  input: CreateReviewActionInput,
): Promise<ReviewDocument> {
  const product = await productRepository.findById(input.productId);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  const profile = await userRepository.findById(userId);

  const images = await finalizeStagedMediaArray(input.images ?? []);
  const finalVideoUrl = input.videoUrl
    ? await finalizeStagedMediaUrl(input.videoUrl)
    : undefined;

  serverLogger.debug("createReview", {
    uid: userId,
    productId: input.productId,
  });

  return reviewRepository.create({
    productId: input.productId,
    productTitle: product.title,
    sellerId: product.sellerId,
    userId,
    userName: profile?.displayName ?? "Anonymous",
    userAvatar: profile?.photoURL ?? "",
    rating: input.rating,
    title: input.title,
    comment: input.comment,
    images,
    video: finalVideoUrl
      ? {
          url: finalVideoUrl,
          thumbnailUrl: finalVideoUrl,
          duration: 0,
        }
      : undefined,
    verified: false,
    status: "pending",
  });
}

export async function updateReview(
  userId: string,
  reviewId: string,
  input: UpdateReviewActionInput,
): Promise<ReviewDocument | null> {
  if (!reviewId?.trim()) {
    throw new ValidationError("reviewId is required");
  }

  const existing = await reviewRepository.findById(reviewId);
  if (!existing) {
    throw new NotFoundError("Review not found");
  }

  if (existing.userId !== userId) {
    throw new AuthorizationError("Not authorized to update this review");
  }

  const { videoUrl, images: rawImages, ...rest } = input;
  const updatePayload: Record<string, unknown> = { ...rest };

  if (rawImages !== undefined) {
    updatePayload.images = await finalizeStagedMediaArray(rawImages);
  }

  if (videoUrl !== undefined) {
    updatePayload.video = videoUrl
      ? {
          url: await finalizeStagedMediaUrl(videoUrl),
          thumbnailUrl: await finalizeStagedMediaUrl(videoUrl),
          duration: 0,
        }
      : null;
  }

  return reviewRepository.update(
    reviewId,
    updatePayload as Partial<ReviewDocument>,
  );
}

export async function deleteReview(
  userId: string,
  reviewId: string,
): Promise<void> {
  if (!reviewId?.trim()) {
    throw new ValidationError("reviewId is required");
  }

  const existing = await reviewRepository.findById(reviewId);
  if (!existing) {
    return;
  }

  if (existing.userId !== userId) {
    throw new AuthorizationError("Not authorized to delete this review");
  }

  await reviewRepository.delete(reviewId);
}

export async function adminUpdateReview(
  adminId: string,
  reviewId: string,
  input: UpdateReviewActionInput,
): Promise<ReviewDocument | null> {
  if (!reviewId?.trim()) {
    throw new ValidationError("reviewId is required");
  }

  const existing = await reviewRepository.findById(reviewId);
  if (!existing) {
    throw new NotFoundError("Review not found");
  }

  serverLogger.info("adminUpdateReview", {
    adminId,
    reviewId,
  });

  const { videoUrl, images: rawImages, ...rest } = input;
  const updatePayload: Record<string, unknown> = { ...rest };

  if (rawImages !== undefined) {
    updatePayload.images = await finalizeStagedMediaArray(rawImages);
  }

  if (videoUrl !== undefined) {
    updatePayload.video = videoUrl
      ? {
          url: await finalizeStagedMediaUrl(videoUrl),
          thumbnailUrl: await finalizeStagedMediaUrl(videoUrl),
          duration: 0,
        }
      : null;
  }

  return reviewRepository.update(
    reviewId,
    updatePayload as Partial<ReviewDocument>,
  );
}

export async function adminDeleteReview(
  adminId: string,
  reviewId: string,
): Promise<void> {
  if (!reviewId?.trim()) {
    throw new ValidationError("reviewId is required");
  }

  const existing = await reviewRepository.findById(reviewId);
  if (!existing) {
    return;
  }

  serverLogger.info("adminDeleteReview", {
    adminId,
    reviewId,
  });

  await reviewRepository.delete(reviewId);
}

export async function voteReviewHelpful(
  reviewId: string,
  helpful: boolean,
): Promise<void> {
  if (!reviewId?.trim()) {
    throw new ValidationError("reviewId is required");
  }

  if (helpful) {
    await reviewRepository.incrementHelpful(reviewId);
  }
}

export async function listReviewsByProduct(
  productId: string,
  page = 1,
  pageSize = 10,
): Promise<FirebaseSieveResult<ReviewDocument>> {
  const result = await reviewRepository.listForProduct(productId, {
    sorts: "-createdAt",
    page,
    pageSize,
  });

  return {
    ...result,
    items: result.items.map((item) => maskPublicReview(item) as ReviewDocument),
  };
}

export async function listAdminReviews(params?: {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
}): Promise<FirebaseSieveResult<ReviewDocument>> {
  const sieve: SieveModel = {
    filters: params?.filters,
    sorts: params?.sorts ?? "-createdAt",
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 50,
  };

  return reviewRepository.listAll(sieve);
}

export async function listReviewsBySeller(
  sellerId: string,
): Promise<ReviewDocument[]> {
  const products = await productRepository.findBySeller(sellerId);
  const productIds = products
    .filter((product) => product.status === "published")
    .map((product) => product.id);

  if (productIds.length === 0) {
    return [];
  }

  const reviewBatches = await Promise.all(
    productIds
      .slice(0, 20)
      .map((id) => reviewRepository.findApprovedByProduct(id).catch(() => [])),
  );

  return reviewBatches
    .flat()
    .map((item) => maskPublicReview(item) as ReviewDocument);
}

export async function getHomepageReviews(): Promise<ReviewDocument[]> {
  const reviews = await reviewRepository.findFeatured(18);
  return reviews.map((item) => maskPublicReview(item) as ReviewDocument);
}

export async function getReviewById(
  id: string,
): Promise<ReviewDocument | null> {
  return reviewRepository.findById(id);
}
