import crypto from "node:crypto";
import { normalizeError } from "../../../../errors/normalize";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import type { JobContext } from "../runtime/types";
import type { ProductDocument, PrizeDrawItem } from "../../../../features/products/schemas/firestore";
import type { OrderDocument } from "../../../../features/orders/schemas/firestore";

const PRODUCT_COLLECTION = "products";
const ORDER_COLLECTION = "orders";

export interface AssignPrizeDrawWinnerResult {
  kind: "revealed" | "already_revealed" | "pool_exhausted" | "not_eligible";
  prizeWon?: OrderDocument["prizeWon"];
}

/**
 * The single place a prize-draw winner is ever picked. Called by every
 * trigger point (payment-confirmed for "instant" mode, sellout-detection,
 * and the expiry sweep for "scheduled" mode) — never call the underlying
 * transaction logic anywhere else.
 *
 * Preserves the exact `crypto.randomInt` rejection-sampled fairness RNG that
 * buyers are shown a public GitHub source link for (product.prizeGithubFileUrl)
 * — do not change the selection algorithm.
 */
export async function assignPrizeDrawWinner(
  ctx: JobContext,
  args: { orderId: string; productId: string },
): Promise<AssignPrizeDrawWinnerResult> {
  if (ctx.env("FEATURE_PRIZE_DRAWS") !== "true") {
    ctx.logger.info("FEATURE_PRIZE_DRAWS disabled — skipping winner assignment");
    return { kind: "not_eligible" };
  }

  const { orderId, productId } = args;
  const orderRef = ctx.db.collection(ORDER_COLLECTION).doc(orderId);
  const productRef = ctx.db.collection(PRODUCT_COLLECTION).doc(productId);

  const result = await ctx.db.runTransaction(async (tx) => {
    const [productSnap, orderSnap] = await Promise.all([
      tx.get(productRef),
      tx.get(orderRef),
    ]);
    if (!productSnap.exists || !orderSnap.exists) {
      return { kind: "not_eligible" as const };
    }

    const product = productSnap.data() as ProductDocument;
    const order = orderSnap.data() as OrderDocument;

    // Idempotent — a winner was already assigned to this order.
    if (order.prizeWon) {
      return { kind: "already_revealed" as const, prizeWon: order.prizeWon };
    }

    if (
      order.paymentStatus !== "paid" ||
      order.status === "cancelled" ||
      order.status === "refunded"
    ) {
      return { kind: "not_eligible" as const };
    }

    const items: PrizeDrawItem[] = Array.isArray(product.prizeDrawItems)
      ? [...product.prizeDrawItems]
      : [];
    const unwonIndices: number[] = items
      .map((it, idx) => (it.isWon ? -1 : idx))
      .filter((idx) => idx >= 0);

    if (unwonIndices.length === 0) {
      // Defensive only — preflightChecks already blocks overselling past
      // prizeMaxEntries, so this should be unreachable outside a genuine
      // race between two concurrent checkouts. No auto-refund here (that
      // was the old buyer-claim-deadline behavior, now retired) — just
      // report it so the caller can log/notify.
      return { kind: "pool_exhausted" as const };
    }

    // crypto.randomInt is rejection-sampled and uniform — safe for fairness.
    const pickPosition = crypto.randomInt(0, unwonIndices.length);
    const pickIndex = unwonIndices[pickPosition];
    const winningItem = items[pickIndex];
    items[pickIndex] = { ...winningItem, isWon: true, wonByOrderId: orderId };

    tx.update(productRef, {
      prizeDrawItems: items,
      updatedAt: ctx.now,
    });

    const prizeWon = {
      itemNumber: winningItem.itemNumber,
      title: winningItem.title,
      images: winningItem.images,
      wonAt: ctx.now,
    };

    const orderItems = Array.isArray(order.items) ? [...order.items] : [];
    const revealedItems = orderItems.map((it) =>
      it.listingType === "prize-draw" ? { ...it, prizeRevealStatus: "revealed" as const } : it,
    );

    tx.update(orderRef, {
      prizeWon,
      ...(revealedItems.length > 0 ? { items: revealedItems } : {}),
      updatedAt: ctx.now,
    });

    return { kind: "revealed" as const, prizeWon, userId: order.userId, productTitle: product.title };
  });

  if (result.kind === "revealed") {
    ctx.logger.info("Prize-draw winner assigned", {
      orderId,
      productId,
      itemNumber: result.prizeWon.itemNumber,
    });
    if (result.userId) {
      try {
        await sendNotification({
          userId: result.userId,
          type: "prize_won",
          priority: "high",
          title: "Your prize is ready!",
          message: `You won "${result.prizeWon.title}" in "${result.productTitle ?? "the draw"}" — check your order for details.`,
          relatedId: orderId,
          relatedType: "order",
          actionUrl: `/user/orders/view/${orderId}`,
        } as never);
      } catch (err) {
        void normalizeError(err);
        ctx.logger.warn("Prize-won notification failed", {
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return { kind: "revealed", prizeWon: result.prizeWon };
  }

  if (result.kind === "pool_exhausted") {
    ctx.logger.warn("Prize-draw pool exhausted at assignment time", { orderId, productId });
  }

  return result;
}
