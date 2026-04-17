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

  const validCoupons = activeCoupons.filter((c) => {
    const startOk =
      !c.validity.startDate || new Date(c.validity.startDate) <= now;
    const endOk = !c.validity.endDate || new Date(c.validity.endDate) >= now;
    return startOk && endOk;
  });

  return {
    promotedProducts,
    featuredProducts,
    activeCoupons: validCoupons,
  };
}
