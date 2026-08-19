import { normalizeError } from "../../../../errors/normalize";
import type { JobContext } from "../runtime/types";
import { assignPrizeDrawWinner } from "./prizeDrawAssignWinner";

const PRODUCT_COLLECTION = "products";

export interface PrizeDrawOrderSnapshot {
  paymentStatus?: string;
  prizeDrawProductId?: string;
  items?: Array<{ listingType?: string }>;
}

/**
 * Instant-mode prize-draw winner assignment. Fires when an order's
 * paymentStatus transitions into "paid" — not at order creation, since a
 * prize-draw order isn't guaranteed to be paid yet at that point (manual
 * bank/UPI payments are confirmed later by the seller/admin; Razorpay
 * confirms near-instantly but still goes through this same status flip).
 */
export async function handlePrizeDrawPaymentConfirmed(
  input: { orderId: string; order: PrizeDrawOrderSnapshot },
  ctx: JobContext,
): Promise<void> {
  const { orderId, order } = input;
  if (!order.prizeDrawProductId) return;
  if (!order.items?.some((it) => it.listingType === "prize-draw")) return;

  let product: { prizeRevealMode?: string } | undefined;
  try {
    const snap = await ctx.db.collection(PRODUCT_COLLECTION).doc(order.prizeDrawProductId).get();
    product = snap.exists ? (snap.data() as { prizeRevealMode?: string }) : undefined;
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("Failed to load prize-draw product for instant reveal", err, { orderId });
    return;
  }
  if (!product || product.prizeRevealMode !== "instant") return;

  await assignPrizeDrawWinner(ctx, { orderId, productId: order.prizeDrawProductId });
}
