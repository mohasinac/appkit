import { cache } from "react";
import { couponsRepository } from "../../../../repositories";
import { isCouponDisplayable } from "../../../../features/promotions/schemas";
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
 * work of copying it and is refused at the till.
 *
 * 🛑 BUT A NOT-YET-OPEN CODE IS KEPT — `isCouponDisplayable`, not
 * `isCouponValid`. This used to be the checkout predicate, which also requires
 * `startDate <= now`, and that single clause is why the Diwali event rendered
 * ONE coupon where it carries five: all four attached codes open on Dhanteras.
 * Publishing a code ahead of time is deliberate ("save it ahead of time," says
 * the event's own copy); hiding it breaks the page's own promise.
 *
 * It does NOT check `perUserLimit` — that is per-reader and unknowable on a
 * cached public page. A reader who has personally exhausted a still-valid
 * coupon is refused at checkout with a message that can explain why; that is
 * the correct place for it.
 */
/**
 * Every live coupon, for the homepage `coupons` rail.
 *
 * 🛑 SAME DISPLAY PREDICATE AS `/promotions` AND THE EVENT PAGE, deliberately.
 * These are the same claim made in three places; a code visible on one and
 * absent from another reads as a broken link. One `isCouponDisplayable` call
 * is what keeps them from drifting — this codebase has paid for hand-written
 * copies of a money predicate before (Root Cause #75), and these three had in
 * fact already drifted from `/api/coupons`, which never applied the
 * start-date clause and so rendered codes the server surfaces swore did not
 * exist.
 *
 * `limit` is applied LAST, after filtering, so an expired code can never
 * occupy one of the rail's slots and silently push a live one off the end.
 */
export const getHomepageCoupons = cache(
  async (limit: number): Promise<AttachedCoupon[]> => {
    /*
     * `safeRead`, for the reason given on `getAttachedCoupons` below: the
     * homepage is prerendered and an unguarded throw during the prerender
     * ATTEMPT is fatal to the production build. A failed read costs the page
     * its coupon rail and records a DEGRADED_READ — it does not cost the
     * homepage.
     */
    const docs = await safeRead(() => couponsRepository.getActiveCoupons(), {
      route: "/",
      key: "promotions.getActiveCoupons",
      fallback: [],
    });
    return docs.filter(isCouponDisplayable).map(toAttachedCoupon).slice(0, limit);
  },
);

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
    return docs.filter(isCouponDisplayable).map(toAttachedCoupon);
  },
);
