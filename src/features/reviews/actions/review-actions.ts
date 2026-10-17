/**
 * Reviews Domain Actions (appkit)
 *
 * Pure business functions for review create/update/delete/vote and query flows.
 * Auth and rate-limit stay in consumer server-action wrappers.
 */

import { sortBy } from "@mohasinac/appkit";
import type { JsonValue } from "@mohasinac/appkit";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../../../errors";

import { serverLogger } from "../../../monitoring";
import { maskPublicReview } from "../../../security";
import {
  finalizeStagedMediaArray,
  finalizeStagedMediaUrl,
} from "../../media/finalize";
import { reviewRepository } from "../repository/reviews.repository";
import { safeRead } from "../../../errors/safe-read";
import { productRepository } from "../../products/repository/products.repository";
import { ProductStatusValues } from "../../products/schemas";
import { userRepository } from "../../auth/repository/user.repository";
import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";
import type { ReviewPlain, ReviewDocument } from "../schemas";

const ERR_REVIEW_ID_REQUIRED = "Review ID is required";

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
  /*
   * `ReviewPlain`: `createReview` on the repository echoes the input rather
   * than re-reading, so the reviewer's name comes back as the plaintext that
   * went in. Declaring `ReviewDocument` claimed it was ciphertext.
   */
): Promise<ReviewPlain> {
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

  return reviewRepository.createReview({
    productId: input.productId,
    productTitle: product.title,
    listingType: product.listingType,
    storeId: product.storeId,
    storeName: product.storeName,
    userId,
    userSlug: profile?.id,
    userName: profile?.displayName ?? "Anonymous",
    userAvatar: profile?.photoURL ?? "",
    rating: input.rating,
    title: input.title,
    comment: input.comment,
    images,
    hasImages: images.length > 0,
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
    throw new ValidationError(ERR_REVIEW_ID_REQUIRED);
  }

  const existing = await reviewRepository.findById(reviewId);
  if (!existing) {
    throw new NotFoundError("Review not found");
  }

  if (existing.userId !== userId) {
    throw new AuthorizationError("Not authorized to update this review");
  }

  const { videoUrl, images: rawImages, ...rest } = input;
  const updatePayload: Record<string, JsonValue> = { ...rest };

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
    updatePayload as Partial<ReviewPlain>,
  );
}

export async function deleteReview(
  userId: string,
  reviewId: string,
): Promise<void> {
  if (!reviewId?.trim()) {
    throw new ValidationError(ERR_REVIEW_ID_REQUIRED);
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
    throw new ValidationError(ERR_REVIEW_ID_REQUIRED);
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
  const updatePayload: Record<string, JsonValue> = { ...rest };

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
    updatePayload as Partial<ReviewPlain>,
  );
}

export async function adminDeleteReview(
  adminId: string,
  reviewId: string,
): Promise<void> {
  if (!reviewId?.trim()) {
    throw new ValidationError(ERR_REVIEW_ID_REQUIRED);
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

/**
 * Record a helpful vote. `userId` is required — without it the endpoint has no
 * idempotency key and a repeated POST inflates the count without limit.
 */
export async function voteReviewHelpful(
  reviewId: string,
  helpful: boolean,
  userId: string,
): Promise<{ counted: boolean; helpfulCount: number }> {
  if (!reviewId?.trim()) {
    throw new ValidationError(ERR_REVIEW_ID_REQUIRED);
  }
  if (!userId?.trim()) {
    throw new ValidationError("A signed-in user is required to vote.");
  }

  if (!helpful) {
    // Only "helpful" is recorded today; an un-vote would need its own path so
    // it cannot be used to decrement a review it never incremented.
    const review = await reviewRepository.findById(reviewId);
    return { counted: false, helpfulCount: review?.helpfulCount ?? 0 };
  }

  return reviewRepository.voteHelpful(reviewId, userId);
}

export async function listReviewsByProduct(
  productId: string,
  page = 1,
  pageSize = 10,
): Promise<FirebaseSieveResult<ReviewPlain>> {
  const result = await reviewRepository.listForProduct(productId, {
    sorts: sortBy("createdAt", "DESC"),
    page,
    pageSize,
  });

  /*
   * No second mask. `reviewRepository.listAll` returns `ReviewPlain` already
   * masked by `maskSieveResult`, so `maskPublicReview` here would mask an
   * already-masked name — and worse, it was being handed ciphertext before
   * that method was converted, where `maskName`'s `hasEncPrefix` guard answers
   * "Anonymous" for every row.
   */
  return result;
}

export async function listAdminReviews(params?: {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
}): Promise<FirebaseSieveResult<ReviewPlain>> {
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
): Promise<ReviewPlain[]> {
  const products = await productRepository.findByStore(sellerId);
  const productIds = products
    .filter((product) => product.status === ProductStatusValues.PUBLISHED)
    .map((product) => product.id);

  if (productIds.length === 0) {
    return [];
  }

  const reviewBatches = await Promise.all(
    productIds
      .slice(0, 20)
      // One product's reviews failing must not empty the whole seller feed —
      // but it silently thins it, so each miss is recorded.
      .map((id) =>
        safeRead(() => reviewRepository.findApprovedByProduct(id, 50), {
          route: "reviews.bySeller",
          key: "reviews.findApprovedByProduct",
          fallback: [],
        }),
      ),
  );

  // Each per-product batch is newest-first, but concatenating them yields product order,
  // not chronological order — the flattened list has to be re-sorted or callers get an
  // arbitrarily interleaved "latest reviews" list.
  return reviewBatches
    .flat()
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    /*
     * `maskedReview`, not `maskPublicReview`.
     *
     * These come from `findApprovedByStore`, a `find*` method that returns raw
     * documents — only the three `list*` methods mask. `maskPublicReview`
     * calls `maskName`, which refuses ciphertext by design and answers
     * "Anonymous", so this public list showed every reviewer as Anonymous.
     * `maskedReview` decrypts first, then masks.
     */
    .map((item) => reviewRepository.maskedReview(item));
}

export async function getHomepageReviews(): Promise<ReviewPlain[]> {
  const reviews = await reviewRepository.findFeatured(18);
  // `findFeatured` returns raw documents — see the note above on why
  // `maskPublicReview` cannot be used on them.
  return reviews.map((item) => reviewRepository.maskedReview(item));
}

export async function getReviewById(
  id: string,
): Promise<ReviewDocument | null> {
  return reviewRepository.findById(id);
}
