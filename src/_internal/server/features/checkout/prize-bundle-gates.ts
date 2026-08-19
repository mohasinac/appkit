/**
 * maxPerUser gate for the checkout pipeline (SB6-C).
 *
 * `enforcePrizePoolCap` was removed in S-SBUNI-RULES (2026-05-13) — the
 * equivalent check now lives in `prizeDrawRule.preflightChecks` in the rule
 * registry and is invoked via `runSyncPreflight`. `computePrizeRevealDeadline`
 * (SB8-A) was removed with the buyer-claim-deadline mechanic — reveal is now
 * fully automatic, there's nothing left for a buyer to "claim" before a
 * deadline.
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

