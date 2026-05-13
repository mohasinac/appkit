/**
 * maxPerUser gate + prize reveal deadline helper for the checkout pipeline
 * (SB6-C, SB8-A).
 *
 * `enforcePrizePoolCap` was removed in S-SBUNI-RULES (2026-05-13) — the
 * equivalent check now lives in `prizeDrawRule.preflightChecks` in the rule
 * registry and is invoked via `runSyncPreflight`.
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

