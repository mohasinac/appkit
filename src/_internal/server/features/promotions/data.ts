import { cache } from "react";
import { couponsRepository } from "../../../../repositories";
import { isCouponValid } from "../../../../features/promotions/schemas";
import type { AttachedCoupon } from "../../../../features/promotions/constants/attached-coupons";
import { toAttachedCoupon } from "./adapters";
import { safeRead } from "../../../../errors/safe-read";

export const getCouponByCode = cache(
  async (code: string) => {
    return (await couponsRepository.getCouponByCode(code)) ?? null;
  },
);

/**
 * Resolve the coupons a piece of content has attached, ready to render.
 *
 * Shared by the event detail page and the blog post page — one implementation,
 * because two hand-rolled copies of "read the ids, drop the dead ones, project"
 * is how a fix lands on the route and never reaches the SSR view that
 * duplicates it (Root Cause #59/#99).
 *
 * 🛑 `cache`d because the page body and `generateMetadata` may both want it.
 * Keyed on the argument list, so callers must pass the SAME array contents —
 * which they do, both reading `doc.couponIds`.
 *
 * 🛑 EXPIRED AND INACTIVE COUPONS ARE DROPPED HERE, not in the renderer.
 * A blog post from March that still advertises a code which now errors at
 * checkout is worse than one that advertises nothing: the reader does the
 * work of copying it and is refused at the till. `isCouponValid` is the same
 * predicate checkout applies (active + inside its window + under its total
 * limit), so the page cannot promise what the till will decline.
 *
 * It does NOT check `perUserLimit` — that is per-reader and unknowable on a
 * cached public page. A reader who has personally exhausted a still-valid
 * coupon is refused at checkout with a message that can explain why; that is
 * the correct place for it.
 */
export const getAttachedCoupons = cache(
  async (couponIds: readonly string[] | undefined): Promise<AttachedCoupon[]> => {
    if (!couponIds || couponIds.length === 0) return [];
    /*
     * `safeRead`, so a Firestore hiccup (or a missing index on a cold
     * collection) costs the page its coupon strip and not the whole render.
     * These pages are prerendered, and an unguarded throw during the
     * prerender ATTEMPT is fatal to the production build — see the dashboard
     * note in § SSR Architecture. The failure is recorded as a DEGRADED_READ
     * rather than swallowed, which is the distinction Root Cause #59 is about.
     */
    const docs = await safeRead(() => couponsRepository.findByIds([...couponIds]), {
      route: "content.attachedCoupons",
      key: "promotions.findByIds",
      fallback: [],
    });
    return docs.filter(isCouponValid).map(toAttachedCoupon);
  },
);
