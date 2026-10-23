"use client";

import { useId } from "react";
import { Badge, Div, Grid, Heading, Stack, Text } from "../../../ui";
import { formatCurrency } from "../../../utils/number.formatter";
import type { AttachedCoupon } from "../constants/attached-coupons";
import { CouponCodeCopyRow } from "./CouponCodeCopyRow";

export interface AttachedCouponsSectionProps {
  /** Already resolved, already filtered — see `getAttachedCoupons`. */
  coupons: AttachedCoupon[];
  /** Section heading. Events and blog posts word this differently. */
  title?: string;
  /** Optional one-line lead-in under the heading. */
  description?: string;
}

/**
 * Headline summary of what a coupon gives — "25% off", "₹200 off",
 * "Free shipping".
 *
 * 🛑 `type` is a plain `string` here, not the `CouponType` union, because this
 * renders a PROJECTION of a document rather than the document. That is a
 * deliberate trade: a new coupon type added upstream falls through to the
 * coupon's own `name` instead of failing to compile. The alternative —
 * `Record<CouponType, …>` — is the right shape when the exhaustiveness is the
 * point (Root Cause #61), and the wrong one across a serialisation boundary
 * where the value has already been stringified.
 */
function summarise(coupon: AttachedCoupon): string | null {
  switch (coupon.type) {
    case "percentage":
      return `${coupon.discountValue}% off`;
    case "fixed":
      return `${formatCurrency(coupon.discountValue, "INR")} off`;
    case "free_shipping":
      return "Free shipping";
    case "points_earn":
      return `${coupon.discountValue}% back in points`;
    default:
      // buy_x_get_y and anything added later: the name already says it.
      return null;
  }
}

/** "Min. spend ₹999 · Up to ₹500 off · Ends 10 Nov" — only the parts that exist. */
function conditionsOf(coupon: AttachedCoupon): string | null {
  const parts: string[] = [];
  if (coupon.minPurchase) parts.push(`Min. spend ${formatCurrency(coupon.minPurchase, "INR")}`);
  if (coupon.maxDiscount) parts.push(`Up to ${formatCurrency(coupon.maxDiscount, "INR")} off`);
  /*
   * 🛑 An absent `endsAt` means NO END DATE, not "expired" — it is `undefined`
   * for every open-ended coupon. Rendering "Expired" here would libel every
   * one of them, and rendering nothing is correct: there is no deadline to
   * report. Expiry is not this component's job at all; `getAttachedCoupons`
   * has already dropped anything past its window.
   */
  if (coupon.endsAt) {
    parts.push(
      `Ends ${new Date(coupon.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * The coupons a piece of content advertises — events and blog posts alike.
 *
 * Copy-code only, by design: the reader takes the code to checkout, where
 * every existing validation, per-user limit and stacking rule already applies
 * against a real cart. An "apply to cart" button here would have to reproduce
 * `detectCouponConflict`'s one-seller-coupon-per-store-plus-one-admin rule and
 * explain its refusals on a page that knows nothing about the cart.
 *
 * 🛑 Renders NOTHING when there are no coupons — not an empty state. This sits
 * inside an article or an event description, and a "no coupons available" box
 * on the 95% of posts that never had one is noise that makes the 5% harder to
 * notice.
 *
 * 🛑 It deliberately does NOT label which seller a coupon belongs to, even
 * though `CouponDocument` carries `scope`/`storeId`. A reader cannot act on
 * that: the coupon either applies to their cart or it does not, and checkout
 * is where that is decided and explained. Printing a store name here would
 * imply a scope the card cannot actually enforce.
 */
export function AttachedCouponsSection({
  coupons,
  title = "Coupons",
  description,
}: AttachedCouponsSectionProps) {
  /*
   * 🛑 `useId`, not a literal. This component is reusable and nothing stops a
   * page mounting it twice — a hardcoded id would then appear on two elements
   * and `aria-labelledby` would resolve to whichever came first, silently
   * mislabelling the second section. React generates one id per instance.
   *
   * Called before the empty-return below because it is a HOOK: an early
   * return above it would change the hook order between a post with coupons
   * and one without.
   */
  const headingId = useId();

  if (coupons.length === 0) return null;

  return (
    <Stack gap="md" aria-labelledby={headingId}>
      <Stack gap="xs">
        <Heading id={headingId} level={2} weight="semibold" size="xl">
          {title}
        </Heading>
        {description ? (
          <Text size="sm" color="muted">
            {description}
          </Text>
        ) : null}
      </Stack>

      {/*
       * `cardsWide`, whose own doc comment names coupons as its case — a 300px
       * floor rather than the standard ladder's, because a card here carries a
       * code, a summary and a conditions line rather than an image and a
       * title, and the conditions line wraps badly below that.
       *
       * Never a hand-written `sm:grid-cols-2 lg:grid-cols-3`: appkit's styles
       * are unlayered while Tailwind utilities sit in `@layer utilities` with
       * `important: true`, so a className would silently beat the prop and this
       * grid would stop matching every other one.
       */}
      <Grid cols="cardsWide" gap="md">
        {coupons.map((coupon) => {
          const summary = summarise(coupon);
          const conditions = conditionsOf(coupon);
          return (
            {/*
              `surface="card"` already carries the border, radius and shadow —
              adding `border=` / `rounded=` beside it emits a second, competing
              set of utilities, and with `important: true` in both Tailwind
              configs the winner is decided by emission order rather than by
              anything readable here (Root Cause #79).
            */}
            <Div key={coupon.id} surface="card" padding="card">
              <Stack gap="sm">
                <Stack gap="xs">
                  {summary ? (
                    <Div>
                      {/*
                       * `variant`, not a `bg-*`/`text-*` className pair. A
                       * status tint and a literal ink are invisible in exactly
                       * one theme (Root Cause #67), and `bg-primary-surface`
                       * authored here would not compile into the consumer
                       * build at all.
                       */}
                      <Badge variant="primary">{summary}</Badge>
                    </Div>
                  ) : null}
                  <Text weight="semibold">{coupon.name}</Text>
                  {coupon.description ? (
                    <Text size="sm" color="muted">
                      {coupon.description}
                    </Text>
                  ) : null}
                </Stack>

                <CouponCodeCopyRow code={coupon.code} ariaContext={coupon.name} />

                {conditions ? (
                  <Text size="xs" color="muted">
                    {conditions}
                  </Text>
                ) : null}
              </Stack>
            </Div>
          );
        })}
      </Grid>
    </Stack>
  );
}
