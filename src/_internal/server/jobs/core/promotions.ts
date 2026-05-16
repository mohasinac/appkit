import { productRepository, couponsRepository } from "../../../../repositories";
import { ProductStatusValues } from "../../../../features/products/schemas/firestore";
import type { JobContext } from "../runtime/types";

export interface PromotionsCallableResult {
  promotedProducts: unknown[];
  featuredProducts: unknown[];
  activeCoupons: unknown[];
  partial?: boolean;
}

/**
 * Promotions data — promoted + featured products and active coupons.
 * Wraps the listing query that needs an OR-shaped
 * (coupon.startDate IS NULL OR <= now) filter Firestore can't express.
 */
export async function runPromotions(
  _input: void,
  ctx: JobContext,
): Promise<PromotionsCallableResult> {
  ctx.logger.info("Promotions data requested");
  const now = new Date();
  const nowIso = now.toISOString();

  const [promotedSettled, featuredSettled, couponsSettled] = await Promise.allSettled([
    productRepository.list(
      {
        filters: `status==${ProductStatusValues.PUBLISHED},isPromoted==true`,
        sorts: "-createdAt",
        page: "1",
        pageSize: "12",
      },
      { status: ProductStatusValues.PUBLISHED },
    ),
    productRepository.list(
      {
        filters: `status==${ProductStatusValues.PUBLISHED},featured==true`,
        sorts: "-createdAt",
        page: "1",
        pageSize: "8",
      },
      { status: ProductStatusValues.PUBLISHED },
    ),
    couponsRepository.list({
      filters: `validity.isActive==true,validity.endDate>=${nowIso}`,
      sorts: "validity.endDate",
      page: "1",
      pageSize: "50",
    }),
  ]);

  const partial =
    promotedSettled.status === "rejected" ||
    featuredSettled.status === "rejected" ||
    couponsSettled.status === "rejected";

  if (partial) {
    ctx.logger.warn("Promotions partial load — some queries failed", {
      promoted: promotedSettled.status,
      featured: featuredSettled.status,
      coupons: couponsSettled.status,
    });
  }

  const promotedItems = promotedSettled.status === "fulfilled" ? promotedSettled.value.items : [];
  const featuredItems = featuredSettled.status === "fulfilled" ? featuredSettled.value.items : [];
  const couponsItems = couponsSettled.status === "fulfilled" ? couponsSettled.value.items : [];

  const activeCoupons = couponsItems.filter(
    (c) => !c.validity?.startDate || new Date(c.validity.startDate) <= now,
  );

  ctx.logger.info("Promotions loaded", {
    promoted: promotedItems.length,
    featured: featuredItems.length,
    coupons: activeCoupons.length,
    partial,
  });

  return {
    promotedProducts: promotedItems,
    featuredProducts: featuredItems,
    activeCoupons,
    ...(partial && { partial: true }),
  };
}
