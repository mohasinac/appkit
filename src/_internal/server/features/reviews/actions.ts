"use server";

/*
 * 🛑 From the DEFINING module, never "@mohasinac/appkit/server".
 *
 * appkit importing its own public server barrel is a self-reference that drags
 * the whole server surface in behind it — `dist/server.js` reaches next/og,
 * next/navigation, next/headers and driver.js. Twenty `actions.ts` files did
 * this for two symbols, and because `obligationSweep` reaches one of them, the
 * Firebase Functions tsup bundle (noExternal: appkit) had to resolve Next:
 * it failed on two `react-server-dom-webpack/*` requires and two @vercel/og
 * .wasm files, naming none of the responsible files. Root Cause #18.
 */
import { wrapAction, type ActionResult } from "../../../shared/types/action-result";
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

export async function createReviewAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
    
      const parsed = createReviewSchema.safeParse(input);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");
      }
    
      const { productId, storeId, rating, title, comment, images } = parsed.data;
    
      await assertNotDuplicateReview(productId, user.uid);
    
      const product = await productRepository.findById(productId);
      const profile = await userRepository.findById(user.uid);
    
      return reviewRepository.createReview({
        productId,
        productTitle: product?.title ?? productId,
        storeId: storeId || product?.storeId,
        storeName: product?.storeName,
        userId: user.uid,
        userName: profile?.displayName ?? user.name ?? "Anonymous",
        userAvatar: profile?.photoURL ?? "",
        rating,
        title,
        // Was `comment: body` — the schema called the field `body` and this
        // line translated it. Both now use the document's own name.
        comment,
        images: images ?? [],
    /* `verified` and `status` are set by `createReview` itself and are
       omitted from `ReviewCreateInput` — passing them here duplicated the
       repository default and was the reason the input type demanded them. */
      });
  });
}

export async function replyToReviewAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    await requireRoleUser(["seller", "admin"]);
    
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
  });
}

export async function deleteReviewAction(input: unknown): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
    
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
  });
}

export async function markReviewHelpfulAction(reviewId: string): Promise<ActionResult<unknown>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
    await getReviewOrThrow(reviewId);
    // Keyed on the voter so a repeated call is a no-op rather than another +1.
    return reviewRepository.voteHelpful(reviewId, user.uid);
  });
}
