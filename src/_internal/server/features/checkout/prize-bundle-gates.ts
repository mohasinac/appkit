/**
 * Prize-draw + bundle + maxPerUser gates for the checkout pipeline (SB6-C, SB8-A).
 *
 * Shared helper used by both `createCheckoutOrderAction` (COD/UPI-manual path)
 * and `verifyAndPlaceRazorpayOrderAction` (Razorpay path). Pulled out here so
 * the two transactional flows enforce the same rules.
 */

import { ValidationError } from "../../../../errors";
import { orderRepository } from "../../../../repositories";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";

export interface PerUserCapViolation {
  productId: string;
  productTitle: string;
  allowance: number;
  alreadyPurchased: number;
  requested: number;
}

/**
 * Pre-transaction read: for every cart item whose product has `maxPerUser`
 * set, count the user's existing active orders and reject the checkout if
 * the new request would push them over the cap.
 *
 * Active = pending / confirmed / processing / shipped / delivered. Cancelled
 * + refunded orders do NOT count (stock was returned to circulation).
 *
 * Throws ValidationError with code `MAX_PER_USER` listing every violating
 * product. The check is informational-rich on purpose — the UI surfaces all
 * blocked items at once instead of revealing them one at a time.
 */
export async function enforceMaxPerUserForCart(args: {
  userId: string;
  items: Array<{ item: CartItemDocument; product: ProductDocument }>;
}): Promise<void> {
  const { userId, items } = args;

  // Aggregate per productId so a cart with multiple lines for the same
  // product still gets one accurate count.
  const cartQuantityByProduct = new Map<string, number>();
  for (const { item } of items) {
    cartQuantityByProduct.set(
      item.productId,
      (cartQuantityByProduct.get(item.productId) ?? 0) + item.quantity,
    );
  }

  const violations: PerUserCapViolation[] = [];
  for (const [productId, requested] of cartQuantityByProduct.entries()) {
    const product = items.find((i) => i.item.productId === productId)?.product;
    if (!product) continue;
    const cap = product.maxPerUser;
    if (typeof cap !== "number" || cap <= 0) continue;

    const alreadyPurchased = await orderRepository.countByUserAndProduct(
      userId,
      productId,
    );
    if (alreadyPurchased + requested > cap) {
      violations.push({
        productId,
        productTitle: product.title,
        allowance: cap,
        alreadyPurchased,
        requested,
      });
    }
  }

  if (violations.length > 0) {
    const summary = violations
      .map(
        (v) =>
          `${v.productTitle}: ${v.alreadyPurchased}/${v.allowance} used, requested ${v.requested}`,
      )
      .join("; ");
    throw Object.assign(
      new ValidationError(
        `Purchase limit reached for one or more items. ${summary}`,
      ),
      { code: "MAX_PER_USER", violations },
    );
  }
}

/**
 * SB8-A — compute the deadline by which the buyer must claim their prize
 * via the reveal API.
 *
 * Rules:
 *   - If the reveal window has not yet opened:
 *       deadline = min(revealWindowStart + revealDeadlineDays, revealWindowEnd)
 *   - If the window is already open:
 *       deadline = min(now + revealDeadlineDays, revealWindowEnd)
 *
 * Returns `undefined` if the product lacks the prize-draw fields.
 */
export function computePrizeRevealDeadline(
  product: Pick<
    ProductDocument,
    | "prizeRevealWindowStart"
    | "prizeRevealWindowEnd"
    | "prizeRevealDeadlineDays"
  >,
  now: Date = new Date(),
): Date | undefined {
  const windowStart = product.prizeRevealWindowStart
    ? new Date(product.prizeRevealWindowStart)
    : undefined;
  const windowEnd = product.prizeRevealWindowEnd
    ? new Date(product.prizeRevealWindowEnd)
    : undefined;
  if (!windowStart || !windowEnd) return undefined;

  const days = product.prizeRevealDeadlineDays ?? 3;
  const dayMs = 86_400_000;
  const base = windowStart.getTime() > now.getTime() ? windowStart : now;
  const candidate = new Date(base.getTime() + days * dayMs);
  return candidate.getTime() < windowEnd.getTime() ? candidate : windowEnd;
}

/**
 * Inside the existing checkout transaction, validate the prize-pool cap for
 * each prize-draw line. Caller must pass the fresh product snapshot read
 * within the transaction (so `prizeCurrentEntries` is up-to-date).
 *
 * Throws ValidationError if any item would overflow the pool.
 */
export function enforcePrizePoolCap(args: {
  productSnapshot: ProductDocument;
  requestedQuantity: number;
}): void {
  const { productSnapshot, requestedQuantity } = args;
  if (productSnapshot.listingType !== "prize-draw") return;

  const max = productSnapshot.prizeMaxEntries ?? 0;
  const current = productSnapshot.prizeCurrentEntries ?? 0;
  if (max > 0 && current + requestedQuantity > max) {
    throw Object.assign(
      new ValidationError(
        `Draw is full for "${productSnapshot.title}". ${current}/${max} entries already in.`,
      ),
      { code: "PRIZE_POOL_FULL", productId: productSnapshot.id },
    );
  }
}
