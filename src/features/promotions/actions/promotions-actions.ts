/**
 * Promotions Domain Actions (appkit)
 *
 * Pure business functions — auth, rate-limiting, and Next.js specifics
 * are handled by the calling server action in the consumer.
 */

import { productRepository } from "../../../features/products/repository/products.repository";
import { couponsRepository } from "../repository/coupons.repository";
import type { ProductDocument } from "../../../features/products/schemas";
import { ProductStatusValues } from "../../../features/products/schemas";
import { sanitizeProductForPublic } from "../../products/utils/sanitize";
import type { CouponDocument } from "../schemas";
import { isCouponDisplayable } from "../schemas";

export interface PromotionsResult {
  promotedProducts: ProductDocument[];
  featuredProducts: ProductDocument[];
  activeCoupons: CouponDocument[];
}

/**
 * Fetch all promotions data in parallel:
 * promoted products, featured products, and active/valid coupons.
 */
export async function getPromotions(): Promise<PromotionsResult> {
  const [promotedRaw, featuredRaw, activeCoupons] = await Promise.all([
    productRepository.findPromoted(),
    productRepository.findFeatured(),
    couponsRepository.getActiveCoupons(),
  ]);

  /*
   * `const now` lived here to feed the hand-inlined coupon validity filter
   * below. That filter is now `isCouponDisplayable`, which takes its own clock,
   * so the binding had no remaining reader.
   */
  /*
   * ── SANITISED, AND IT WAS NOT ─────────────────────────────────────────────
   *
   * 🛑 MEASURED LEAKING 2026-11-14: `/promotions/all` served
   * `eventPrize.winnerUserIds: ["<uid>"]` and `claimWindowEndsAt` to an
   * ANONYMOUS visitor, because these two lists returned RAW `ProductDocument`s
   * straight into an ISR-cached page.
   *
   * ⚠ The prize uid is the part that was found, but it is not the worst thing
   * these rows carry. `products` joined the PII registry on 2026-11-11 and
   * `ProductRepository.mapDoc` does NOT decrypt, so a raw row also holds
   * `sellerName`/`sellerEmail` CIPHERTEXT and their `*Index` blind-index
   * siblings — and a blind index is deterministic, so publishing one is an
   * offline *"is this person a seller here"* oracle. `sanitizeProductForPublic`
   * exists for exactly that and these lists never called it.
   *
   * 🛑 Why it survived: the prizes SECTION on the same page was safe, because
   * `toPublicEventPrize` rebuilds the block field by field. The same product
   * reached the page twice by two routes and only one was guarded — the
   * recorded lesson that a leak is found by asking what a surface SHIPS, not
   * by checking the path you happen to be looking at.
   */
  const promotedProducts = promotedRaw
    .filter((p) => p.status === ProductStatusValues.PUBLISHED)
    .slice(0, 12)
    .map((p) => sanitizeProductForPublic(p));

  const featuredProducts = featuredRaw
    .filter((p) => p.status === ProductStatusValues.PUBLISHED)
    .slice(0, 8)
    .map((p) => sanitizeProductForPublic(p));

  /*
   * 🛑 A HAND-INLINED COPY OF THE VALIDITY RULE, AND IT DISAGREED WITH THE
   * PAGE IT FEEDS.
   *
   * This required `startDate <= now`, so every code published ahead of its
   * opening date was dropped — while `/api/coupons`, which the page's own
   * `CouponsIndexListing` fetches from client-side, has never applied that
   * clause. The result was a page whose server half swore there were no
   * coupons and whose client half rendered three, and a Coupons tab counted
   * from the half that was wrong.
   *
   * `isCouponDisplayable` is the shared predicate — expired and inactive are
   * still dropped, not-yet-open is kept. Root Cause #75: one money predicate,
   * hand-written in several places, is how the copies silently diverge.
   */
  const validCoupons = activeCoupons.filter(isCouponDisplayable);

  return {
    promotedProducts,
    featuredProducts,
    activeCoupons: validCoupons,
  };
}
