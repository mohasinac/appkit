"use server";

import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { isAdminUser } from "../../../../features/auth/role-predicates";
import {
  reviewRepository,
  productRepository,
  userRepository,
} from "../../../../repositories";
import { ValidationError } from "../../../shared/errors/index";
import {
  createReviewSchema,
  replyToReviewSchema,
  deleteReviewSchema,
} from "../../../shared/features/reviews/schema";
import {
  assertNotDuplicateReview,
  assertReviewOwnership,
  getReviewOrThrow,
} from "./service";

export async function createReviewAction(input: unknown) {
  const user = await requireRoleUser(["buyer", "seller", "admin"]);

  const parsed = createReviewSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { productId, storeId, rating, title, body, images } = parsed.data;

  await assertNotDuplicateReview(productId, user.uid);

  const product = await productRepository.findById(productId);
  const profile = await userRepository.findById(user.uid);

  return reviewRepository.create({
    productId,
    productTitle: product?.title ?? productId,
    storeId: storeId || product?.storeId,
    storeName: product?.storeName,
    userId: user.uid,
    userName: profile?.displayName ?? user.name ?? "Anonymous",
    userAvatar: profile?.photoURL ?? "",
    rating,
    title,
    comment: body,
    images: images ?? [],
    verified: false,
    status: "pending",
  });
}

export async function replyToReviewAction(input: unknown) {
  const user = await requireRoleUser(["seller", "admin"]);

  const parsed = replyToReviewSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { reviewId, reply } = parsed.data;
  await getReviewOrThrow(reviewId);

  return reviewRepository.update(reviewId, {
    sellerReply: reply,
    sellerRepliedAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function deleteReviewAction(input: unknown) {
  const user = await requireRoleUser(["buyer", "seller", "admin"]);

  const parsed = deleteReviewSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { reviewId } = parsed.data;

  if (!isAdminUser(user)) {
    await assertReviewOwnership(reviewId, user.uid);
  } else {
    await getReviewOrThrow(reviewId);
  }

  await reviewRepository.delete(reviewId);
}

export async function markReviewHelpfulAction(reviewId: string) {
  await requireRoleUser(["buyer", "seller", "admin"]);
  await getReviewOrThrow(reviewId);
  await reviewRepository.incrementHelpful(reviewId);
}
