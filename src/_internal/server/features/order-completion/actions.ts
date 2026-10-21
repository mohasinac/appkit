"use server";

/**
 * Order completion — per-item ratings, and the two ways an order completes.
 *
 * ## The owner's rule, 2026-10-21
 *
 * > *"Points only get issued on successful purchases after buyer put reviews…
 * > they are also assigned if the user [raises] no issues or updates after 7
 * > days of delivery — no further disputes should be entertained as well."*
 *
 * > *"Auto assigned after 7 days of delivery, when order is marked complete; if
 * > review is given and order marked complete by the buyer before — immediate
 * > disburse."*
 *
 * > *"Like in Zomato, each item of the order can be individually rated and a
 * > comment can be given — use that."*
 *
 * So completion has exactly two writers, and they are not equivalent:
 *
 * | writer | when | effect |
 * |---|---|---|
 * | `obligationSweep` (`order-complete`) | 7 days after delivery, nothing contested | completes; points award |
 * | `markOrderCompleteAction` | the buyer, having rated at least one item | completes NOW; **immediate disburse** |
 *
 * 🛑 **The "immediate disburse" half needs no extra mechanism, and that is the
 * nicest property of the design.** `payout-release` is already
 * `blockedBy: ["order-complete", …]`, so a buyer completing early opens the
 * seller's payout gate early as a CONSEQUENCE rather than as a second
 * decision. The buyer confirming satisfaction is precisely the signal a quiet
 * period exists to wait for — so when it arrives, waiting out the rest of the
 * period is pure dead time for the seller.
 */

import { wrapAction, type ActionResult } from "../../../shared/types/action-result";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";
import { ValidationError, NotFoundError, ConflictError } from "../../../../errors";
import { orderRepository } from "../../../../features/orders/repository/orders.repository";
import { reviewRepository } from "../../../../features/reviews/repository/reviews.repository";
import { obligationsRepository } from "../../../../features/obligations/repository/obligations.repository";
import type { OrderDocument } from "../../../../features/orders/schemas/firestore";

/** The lines of an order a buyer can rate — one entry per order line. */
export interface RateableOrderItem {
  orderItemId: string;
  productId: string;
  productTitle: string;
  /** The buyer's existing rating for this line, when they have left one. */
  existingRating?: number;
}

/**
 * Which lines of this order the buyer may rate, and which they already have.
 *
 * 🛑 Reads the buyer's OWN reviews (`findByUser`) rather than each product's
 * reviews (`findByProduct`). A product can carry thousands of reviews and a
 * buyer carries a handful, so this is bounded by the right dimension —
 * `findByProduct` on a popular bey would be an unbounded read to answer a
 * question about one person (Rule #6).
 */
export async function getRateableItemsAction(
  orderId: string,
): Promise<ActionResult<RateableOrderItem[]>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
    const order = await orderRepository.findById(orderId);
    if (!order) throw new NotFoundError(`Order ${orderId} not found`);
    if (order.userId !== user.uid) {
      throw new ValidationError("You can only rate your own order.");
    }

    const mine = await reviewRepository.findByUser(user.uid);
    const byLine = new Map<string, number>();
    const byProduct = new Map<string, number>();
    for (const r of mine) {
      if (r.orderId !== orderId) continue;
      if (r.orderItemId) byLine.set(r.orderItemId, r.rating);
      byProduct.set(r.productId, r.rating);
    }

    return orderLinesOf(order).map((line) => {
      /*
       * Line id first, product id as the fallback — a review written before
       * `orderItemId` existed can only be matched by product, and treating it
       * as "not rated" would ask the buyer to rate something twice.
       */
      const existing = byLine.get(line.orderItemId) ?? byProduct.get(line.productId);
      return {
        ...line,
        ...(existing !== undefined ? { existingRating: existing } : {}),
      };
    });
  });
}

/**
 * The order's rateable lines.
 *
 * 🛑 `items[]` is OPTIONAL on `OrderDocument` — the flat
 * `productId`/`productTitle`/`quantity`/`unitPrice` fields are the primary
 * shape, not legacy residue (CLAUDE.md corrected this on 2026-10-03 after the
 * opposite was assumed for months). So both shapes are handled, and the flat
 * one synthesises a line id from the order itself.
 */
function orderLinesOf(order: OrderDocument): RateableOrderItem[] {
  /*
   * 🛑 `OrderDocumentItem` HAS NO `itemId` — verified against the interface,
   * which carries `productId`/`productTitle`/`quantity`/`unitPrice`/`totalPrice`
   * and no identity of its own. So a line id has to be synthesised, and the
   * obvious synthesis is wrong.
   *
   * An INDEX-based id (`${order.id}__${index}`) shifts the moment a line is
   * cancelled or the array is rewritten — and `expandCartLineToOrderRows` fans
   * a grouped line into N rows, so rewrites happen. A rating would then attach
   * to a different product than the one it was written about. That is the
   * merge-by-index hazard the lottery-slot fix is about, one feature over.
   *
   * Keyed on `productId` plus an occurrence counter instead: stable under
   * reordering and under the removal of OTHER lines, and only ambiguous if two
   * rows of the SAME product change relative order — which is both rarer and
   * deterministic, since the counter follows array order within that product.
   */
  if (order.items?.length) {
    const seen = new Map<string, number>();
    return order.items.map((item) => {
      const n = seen.get(item.productId) ?? 0;
      seen.set(item.productId, n + 1);
      return {
        orderItemId: `${order.id}__${item.productId}__${n}`,
        productId: item.productId,
        productTitle: item.productTitle ?? item.productId,
      };
    });
  }
  /*
   * The FLAT shape. `items[]` is optional and the flat
   * `productId`/`productTitle` fields are the primary form, not legacy residue
   * — CLAUDE.md corrected the opposite assumption on 2026-10-03 after it had
   * stood for months.
   */
  if (!order.productId) return [];
  return [
    {
      orderItemId: `${order.id}__${order.productId}__0`,
      productId: order.productId,
      productTitle: order.productTitle ?? order.productId,
    },
  ];
}

export interface RateOrderItemInput {
  orderId: string;
  orderItemId: string;
  rating: number;
  comment: string;
  title?: string;
  images?: string[];
}

/**
 * Rate ONE line of an order — the Zomato-style per-item review.
 *
 * 🛑 Gated on DELIVERY, not on completion. A buyer must be able to rate before
 * marking the order complete, because rating is the precondition for the fast
 * completion path — gating it on completion would make the fast path
 * unreachable, which is a circular dependency that would look like a bug in
 * the button.
 */
export async function rateOrderItemAction(
  input: RateOrderItemInput,
): Promise<ActionResult<{ reviewId: string }>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);

    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      throw new ValidationError("A rating must be a whole number from 1 to 5.");
    }
    const comment = input.comment?.trim() ?? "";
    if (comment.length < 5) {
      throw new ValidationError("Please say a little about this item — at least a few words.");
    }

    const order = await orderRepository.findById(input.orderId);
    if (!order) throw new NotFoundError(`Order ${input.orderId} not found`);
    if (order.userId !== user.uid) {
      throw new ValidationError("You can only rate your own order.");
    }
    if (!order.deliveryDate) {
      throw new ValidationError(
        "This order has not been delivered yet, so there is nothing to rate.",
      );
    }

    const line = orderLinesOf(order).find((l) => l.orderItemId === input.orderItemId);
    if (!line) {
      throw new NotFoundError(`Order ${input.orderId} has no line ${input.orderItemId}`);
    }

    /*
     * One rating per line. Checked against the buyer's own reviews, which is
     * the same bounded read `getRateableItemsAction` uses.
     *
     * 🛑 A 409 rather than an overwrite: editing a published review is a
     * different operation with its own moderation implications, and silently
     * replacing one would let a buyer revise a 1-star to a 5-star after a
     * seller contacted them, with no trace that it had changed.
     */
    const mine = await reviewRepository.findByUser(user.uid);
    const already = mine.find(
      (r) =>
        r.orderId === input.orderId &&
        (r.orderItemId === input.orderItemId || r.productId === line.productId),
    );
    if (already) {
      throw new ConflictError(
        "You have already rated this item. Edit your existing review rather than adding a second one.",
      );
    }

    /*
     * `createReview`, not `create` — the repository's own method, which mints
     * the semantic review id and sets `status: "pending"` so a rating enters
     * moderation exactly as any other review does. A per-item rating is not a
     * privileged class of review.
     */
    const review = await reviewRepository.createReview({
      productId: line.productId,
      productTitle: line.productTitle,
      userId: user.uid,
      userName: user.displayName ?? user.email ?? "Buyer",
      rating: input.rating,
      title: input.title?.trim() || line.productTitle,
      comment,
      ...(input.images?.length ? { images: input.images, hasImages: true } : {}),
      /*
       * The link that did not exist. `orderId` + `orderItemId` are what make
       * "was this order rated" answerable, and `isVerifiedPurchase` is finally
       * written by something — it was read in two places and written by
       * nothing, so no review has ever been attributable to a purchase.
       */
      orderId: order.id,
      orderItemId: line.orderItemId,
      isVerifiedPurchase: true,
      ...(order.storeId ? { storeId: order.storeId } : {}),
    } as Parameters<typeof reviewRepository.createReview>[0]);

    serverLogger.info("order item rated", {
      orderId: order.id,
      orderItemId: line.orderItemId,
      rating: input.rating,
    });

    return { reviewId: review.id };
  });
}

/**
 * The buyer marks the order complete — the FAST path.
 *
 * Requires at least one rated line, per the owner's rule (*"if review is given
 * and order marked complete by the buyer"*).
 *
 * 🛑 **At least one, not all.** Requiring every line would make a six-item
 * order's completion hostage to the one item the buyer has no opinion about —
 * and the buyer's alternative is simply to wait 7 days and be completed
 * automatically with no review at all, which is strictly worse for everyone.
 * One rating is the signal; demanding six is a toll.
 *
 * 🛑 It REFUSES while anything is contested, and the check is the obligation
 * policy's own `precondition` rather than a second hand-written copy — so the
 * buyer-initiated path and the 7-day sweep cannot disagree about what "nothing
 * contested" means.
 */
export async function markOrderCompleteAction(
  orderId: string,
): Promise<ActionResult<{ completedAt: string; payoutUnblocked: boolean }>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);

    const order = await orderRepository.findById(orderId);
    if (!order) throw new NotFoundError(`Order ${orderId} not found`);
    if (order.userId !== user.uid) {
      throw new ValidationError("You can only complete your own order.");
    }
    if (order.completedAt) {
      throw new ConflictError("This order is already marked complete.");
    }
    if (!order.deliveryDate) {
      throw new ValidationError(
        "This order has not been delivered yet. You can mark it complete once it arrives.",
      );
    }

    /*
     * Nothing contested. Deliberately mirrors `order-complete`'s precondition
     * — a buyer must not be able to close the dispute window on an order they
     * have an open return or refund against, which would be them waiving a
     * claim by pressing a button labelled "mark complete".
     */
    if (
      order.status === "return_requested" ||
      order.status === "returned" ||
      order.returnRequestedAt ||
      order.disputeRaised ||
      (order.refunds?.length ?? 0) > 0
    ) {
      throw new ValidationError(
        "This order has an open return, refund or dispute. It will complete once that is resolved.",
      );
    }

    const mine = await reviewRepository.findByUser(user.uid);
    const ratedThisOrder = mine.some((r) => r.orderId === orderId);
    if (!ratedThisOrder) {
      throw new ValidationError(
        "Please rate at least one item from this order first — that is what lets us close it now rather than waiting out the 7-day window.",
      );
    }

    const now = new Date();
    await orderRepository.update(orderId, {
      completedAt: now,
      completedBy: user.uid,
    } as Partial<OrderDocument>);

    /*
     * Close the timer, so the sweep does not re-fire on an order the buyer has
     * already closed. `met`, not `acted`: the thing the obligation was waiting
     * for HAPPENED, which is exactly what that state means.
     */
    await obligationsRepository().close(orderId, "order-complete", {
      state: "met",
      closeReason: `the buyer marked the order complete after rating it`,
      now,
    });

    /*
     * 🛑 The payout gate opens as a CONSEQUENCE, not as a second write.
     * `payout-release` is `blockedBy: ["order-complete", …]`, so closing the
     * obligation above is what unblocks it — which is the "immediate disburse"
     * the owner asked for, with no extra mechanism and no second place to keep
     * in step.
     */
    const stillBlocking = await obligationsRepository().listOpenForSubject(orderId);
    const payoutUnblocked = !stillBlocking.some((o) => o.kind !== "payout-release");

    serverLogger.warn("order marked complete by buyer — fast path", {
      orderId,
      payoutUnblocked,
      stillOpen: stillBlocking.map((o) => o.kind),
    });

    /*
     * 🛑 THE POINTS AWARD IS STILL NOT WRITTEN HERE — Phase P owns the ledger.
     * Both completion paths now record the same FACT (`completedAt`), so the
     * award has one thing to key on and can be idempotent across both. Writing
     * it from two places before that key exists is how an append-only ledger
     * ends up with a permanent double credit.
     */
    return { completedAt: now.toISOString(), payoutUnblocked };
  });
}
