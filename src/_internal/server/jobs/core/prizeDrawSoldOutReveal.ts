import { normalizeError } from "../../../../errors/normalize";
import type { JobContext } from "../runtime/types";
import { PRODUCT_FIELDS, ORDER_FIELDS, COMMON_FIELDS } from "../../../../constants/field-names";
import { assignPrizeDrawWinner } from "./prizeDrawAssignWinner";
import type { OrderDocument } from "../../../../features/orders/schemas/firestore";

const ORDER_COLLECTION = "orders";

export interface PrizeDrawStockSnapshot {
  listingType?: string;
  prizeDrawMode?: string;
  prizeRevealMode?: string;
  prizeRevealStatus?: string;
  prizeMaxEntries?: number;
  prizeCurrentEntries?: number;
}

export interface HandlePrizeDrawSoldOutInput {
  productId: string;
  before: PrizeDrawStockSnapshot | null;
  after: PrizeDrawStockSnapshot | null;
}

function isSoldOut(doc: PrizeDrawStockSnapshot | null): boolean {
  if (!doc) return false;
  const max = doc.prizeMaxEntries ?? 0;
  if (max <= 0) return false;
  return (doc.prizeCurrentEntries ?? 0) >= max;
}

/**
 * "Scheduled" reveal mode, sellout half — the other trigger condition besides
 * expiry (prizeDrawExpiryReveal.ts). Fires the instant a scheduled-mode draw's
 * last entry sells, so buyers don't have to wait for the expiry sweep once
 * every ticket is gone. Assigns a winner to every paid, unrevealed order for
 * the draw, then closes it.
 */
export async function handlePrizeDrawSoldOut(
  input: HandlePrizeDrawSoldOutInput,
  ctx: JobContext,
): Promise<void> {
  if (ctx.env("FEATURE_PRIZE_DRAWS") !== "true") return;

  const { productId, before, after } = input;
  if (!after) return;
  if (after.listingType !== "prize-draw") return;
  if (after.prizeDrawMode === "lottery") return; // out of scope — separate mechanic
  if (after.prizeRevealMode !== "scheduled") return;
  if (after.prizeRevealStatus !== PRODUCT_FIELDS.PRIZE_REVEAL_STATUS_VALUES.OPEN) return;

  // Only act on the crossing transition into sold-out — avoids re-firing on
  // every later write to an already-closed draw.
  if (isSoldOut(before) || !isSoldOut(after)) return;

  const orders = await ctx.db
    .collection(ORDER_COLLECTION)
    .where(ORDER_FIELDS.PRIZE_DRAW_PRODUCT_ID, "==", productId)
    .where(ORDER_FIELDS.PAYMENT_STATUS, "==", ORDER_FIELDS.PAYMENT_STATUS_VALUES.PAID)
    .where(ORDER_FIELDS.STATUS, "in", [
      ORDER_FIELDS.STATUS_VALUES.PENDING,
      ORDER_FIELDS.STATUS_VALUES.CONFIRMED,
      ORDER_FIELDS.STATUS_VALUES.PROCESSING,
    ])
    .get();

  let revealed = 0;
  for (const orderDoc of orders.docs) {
    const order = orderDoc.data() as Pick<OrderDocument, "prizeWon">;
    if (order.prizeWon) continue;
    try {
      const result = await assignPrizeDrawWinner(ctx, { orderId: orderDoc.id, productId });
      if (result.kind === "revealed") revealed++;
    } catch (err) {
      void normalizeError(err);
      ctx.logger.error("Sellout reveal failed for order", err, { orderId: orderDoc.id, productId });
    }
  }

  await ctx.db.collection("products").doc(productId).update({
    [PRODUCT_FIELDS.PRIZE_REVEAL_STATUS]: PRODUCT_FIELDS.PRIZE_REVEAL_STATUS_VALUES.CLOSED,
    [COMMON_FIELDS.UPDATED_AT]: ctx.now,
  });

  ctx.logger.info("Closed prize draw on sellout", { productId, revealed });
}
