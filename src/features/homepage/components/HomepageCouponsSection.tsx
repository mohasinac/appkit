/*
 * WHY: The homepage coupon rail — live discount codes, linking to /promotions.
 *
 * It replaced the `events` rail on 2026-10-25 at the owner's instruction. That
 * rail was advertising five promotions that did not exist: only the Diwali
 * offer was real and the other four were fabricated seed fixtures that had been
 * promoted to the front page. A coupon cannot be invented the same way — it is
 * a code the till either honours or refuses — which is the point of the swap.
 *
 * @tag domain:homepage,promotions
 * @tag layer:feature-component
 * @tag access:public
 */

import Link from "next/link";
import { Row, Stack } from "../../../ui/components/Layout";
import { ROUTES } from "../../../next/routing/route-map";
import { AttachedCouponsSection } from "../../promotions/components/AttachedCouponsSection";
import type { AttachedCoupon } from "../../promotions/constants/attached-coupons";

export interface HomepageCouponsSectionProps {
  /** Already resolved and already validity-filtered — see `getHomepageCoupons`. */
  coupons: AttachedCoupon[];
  title?: string;
  description?: string;
  viewMoreLabel?: string;
  /** How many to show before the "view all" link takes over. */
  limit?: number;
}

/**
 * 🛑 RENDERS NOTHING WHEN THERE ARE NO LIVE CODES, rather than an empty state.
 *
 * `AttachedCouponsSection` already returns `null` on an empty list, but relying
 * on that alone would still paint this component's own "View all offers →"
 * link under a heading with nothing above it — a section that is visually just
 * a stray link. The guard has to be here too, which is why it is not left to
 * the child.
 *
 * This is the same rule the section gate in `MarketplaceHomepageView` applies
 * one level up, and the reason both exist: that gate can hide a section whose
 * whole FEATURE is switched off, but it cannot know that this particular rail
 * happens to have no rows today.
 */
export function HomepageCouponsSection({
  coupons,
  title = "Offers & coupons",
  description = "Live discount codes — copy one and apply it at checkout.",
  viewMoreLabel = "View all offers →",
  limit,
}: HomepageCouponsSectionProps) {
  /*
   * Slice here rather than at the fetch, so the "view all" link can be honest
   * about there being more behind it without a second count being passed down.
   */
  const shown = typeof limit === "number" ? coupons.slice(0, limit) : coupons;

  if (shown.length === 0) return null;

  return (
    <Stack gap="md">
      <AttachedCouponsSection
        coupons={shown}
        title={title}
        description={description}
      />
      {/*
        `next/link`, never a bare `<a>` — an anchor does a full page load and
        the regression is invisible apart from the flash.

        `ROUTES.PUBLIC.PROMOTIONS`, never the literal "/promotions": a
        hardcoded href is the anti-pattern the route map exists to remove, and
        this one would survive a rename silently.
      */}
      <Row justify="start">
        <Link
          href={String(ROUTES.PUBLIC.PROMOTIONS)}
          className="text-primary font-semibold hover:underline"
        >
          {viewMoreLabel}
        </Link>
      </Row>
    </Stack>
  );
}
