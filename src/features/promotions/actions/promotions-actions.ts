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

  const now = new Date();

  const promotedProducts = promotedRaw
    .filter((p) => p.status === ProductStatusValues.PUBLISHED)
    .slice(0, 12);

  const featuredProducts = featuredRaw
    .filter((p) => p.status === ProductStatusValues.PUBLISHED)
    .slice(0, 8);

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
