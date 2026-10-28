/**
 * Chart specs for event pages — pure builders, no React, no recharts.
 *
 * Kept free of any import that reaches the DOM so a Server Component can call
 * these and hand the result to `<Chart>`, whose own `"use client"` boundary is
 * internal (`chart-spec.ts` is deliberately the same shape of module).
 *
 * ## 🛑 EVERY NUMBER HERE IS MEASURED, NOT ILLUSTRATIVE
 *
 * A chart asserts "we measured this". So each builder returns `null` rather
 * than a plausible-looking shape when it has nothing real to plot — an absent
 * chart says "not enough data yet", a flat or invented one says "we measured,
 * and this is the result", which is a different and false claim.
 *
 * @tag domain:events
 * @tag layer:utils
 */

import type { ChartSpec } from "../../../ui/components/chart-spec";
import { calculateDiscount } from "../../promotions/schemas/firestore";
import type { CouponDocument } from "../../promotions/schemas/firestore";
import type { AttachedCoupon } from "../../promotions/constants/attached-coupons";
import { formatMoney } from "../../../utils/number.formatter";


/** A poll needs at least one real vote before a bar chart means anything. */
const MIN_VOTES = 1;

/**
 * Poll results as bars.
 *
 * The data already existed and was rendered as the plain string
 * "12 votes (34%)" — `getEventPollResults` computes both server-side and
 * `EventLeaderboard` printed them in a flex row. This is the same numbers,
 * shaped so the differences between options are visible at a glance.
 */
export function buildPollChart(
  // Structural, not the full `PollConfig`: this reads `options` and nothing
  // else, and the page carries a narrower local declaration of its own.
  pollConfig: { options?: { id: string; label: string }[] } | undefined,
  results: { optionId: string; count: number }[] | undefined,
): ChartSpec | null {
  if (!pollConfig?.options?.length || !results?.length) return null;

  const byId = new Map(results.map((r) => [r.optionId, r.count]));
  const total = results.reduce((sum, r) => sum + r.count, 0);
  if (total < MIN_VOTES) return null;

  return {
    kind: "bar",
    title: "Votes so far",
    categories: pollConfig.options.map((o) => o.label),
    series: [{ label: "Votes", values: pollConfig.options.map((o) => byId.get(o.id) ?? 0) }],
    unit: "votes",
    caption: `${total} vote${total === 1 ? "" : "s"} counted.`,
  };
}

/**
 * The basket sizes the savings chart compares across.
 *
 * 🛑 THE RANGE IS CHOSEN TO SHOW THE CROSSOVER, which is the only thing this
 * chart can usefully tell someone. At ₹2,000 the two 10% codes TIE at ₹200 and
 * their caps are irrelevant; an uncapped 5% only overtakes a ₹500-capped 10%
 * once the basket passes ₹10,000. A single-basket bar chart would show three
 * bars, two of them identical, and teach nothing.
 */
const BASKET_SIZES = [1000, 2000, 5000, 12000] as const;

const INR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/**
 * What each cashback coupon actually saves, across basket sizes.
 *
 * 🛑 COMPUTED WITH THE REAL `calculateDiscount`, never a re-derived formula.
 * That function is where `maxDiscount`, `minPurchase` and the tier table are
 * honoured; computing the percentage inline here would silently ignore all three and
 * overstate every capped code. Root Cause #75 is a money rule hand-copied into
 * six places, where the copies never learned about a branch added later.
 *
 * 🛑 `free_shipping` AND `buy_x_get_y` ARE EXCLUDED, not plotted at zero.
 * `calculateDiscount` returns 0 for free shipping BY DESIGN — the waiver is a
 * shipping line, not a subtotal discount — and a BOGO's value depends on the
 * basket's composition, not its total (₹500 on 4x₹500, ₹0 on 2x₹1,000). A bar
 * at zero for either would read as "this code saves you nothing", which is a
 * lie by omission. They belong in the caption, and that is where they go.
 */
/**
 * 🛑 TAKES THE PUBLIC PROJECTION, NOT THE DOCUMENT — and still calls the
 * real `calculateDiscount`.
 *
 * The event page only ever holds `AttachedCoupon`, the allow-list
 * projection (Root Cause #70 — the full document carries fields no public
 * surface should see). That projection carries exactly the four facts the
 * calculator needs, under different names: `type`, `discountValue`,
 * `maxDiscount`, `minPurchase`.
 *
 * So this MAPS NAMES and delegates. The tempting shortcut — computing
 * the percentage inline right here, because the projection makes it
 * easy — is precisely Root Cause #75: a money rule re-derived at a call
 * site, which then never learns about the cap, the minimum or the tier
 * table the real function honours.
 */
function toCalculable(c: AttachedCoupon): CouponDocument {
  return {
    type: c.type,
    discount: {
      value: c.discountValue,
      maxDiscount: c.maxDiscount,
      minPurchase: c.minPurchase,
    },
  } as unknown as CouponDocument;
}

export function buildCouponSavingsChart(coupons: AttachedCoupon[]): ChartSpec | null {
  const plottable = coupons.filter(
    (c) => c.type === "percentage" || c.type === "fixed",
  );
  if (plottable.length === 0) return null;

  const excluded = coupons
    .filter((c) => !plottable.includes(c))
    .map((c) => c.code);

  const series = plottable.map((coupon) => ({
    label: coupon.code,
    values: BASKET_SIZES.map((basket) =>
      Math.round(calculateDiscount(toCalculable(coupon), basket)),
    ),
  }));

  // Every code saving nothing at every size means the minimums are all above
  // our largest basket — a chart of four empty groups.
  if (series.every((s) => s.values.every((v) => v === 0))) return null;

  const captionParts = ["One code per order — this is a choose-one comparison."];
  if (excluded.length) {
    captionParts.push(
      `${excluded.join(" and ")} ${excluded.length === 1 ? "is" : "are"} not shown: ` +
        `their value depends on delivery or on what is in the basket, not on the total.`,
    );
  }

  return {
    kind: "groupedBar",
    title: "What each code saves",
    categories: BASKET_SIZES.map((b) => formatMoney(b)),
    series,
    unit: "₹",
    caption: captionParts.join(" "),
  };
}

/**
 * Likes over time. Data comes from `getLikeTrend`, which returns `null` below
 * `LIKE_TREND_MIN_POINTS` so a two-like event plots nothing rather than a flat
 * line with axes.
 */
export function buildLikeTrendChart(
  trend: { categories: string[]; values: number[] } | null,
): ChartSpec | null {
  if (!trend) return null;
  return {
    kind: "area",
    title: "Interest over the last fortnight",
    categories: trend.categories,
    series: [{ label: "Likes", values: trend.values }],
    unit: "likes",
    caption: "Likes received per day.",
  };
}

export interface SaleProgress {
  /** 0–100, how far through the sale window we are. */
  elapsedPercent: number;
  /** Human remaining time, or null once it has ended. */
  endsAt: Date | null;
  /** 0–100 of a coupon's total redemption allowance, when one is capped. */
  claimedPercent: number | null;
  claimedLabel: string | null;
}

/**
 * Time elapsed in the sale window, and redemptions against a real cap.
 *
 * 🛑 `claimedPercent` IS null UNLESS A REAL CAP EXISTS. `usage.totalLimit` is
 * optional, and an uncapped coupon has no denominator — rendering a progress
 * bar against an invented 100 would show a bar filling toward a limit nobody
 * set. Absent is the honest state and the caller renders only the countdown.
 */
export function buildSaleProgress(
  startsAt: Date | undefined,
  endsAt: Date | undefined,
  coupon?: Pick<CouponDocument, "usage" | "code">,
  now: Date = new Date(),
): SaleProgress | null {
  if (!startsAt || !endsAt) return null;

  const start = startsAt.getTime();
  const end = endsAt.getTime();
  if (!(end > start)) return null;

  const elapsed = ((now.getTime() - start) / (end - start)) * 100;

  const limit = coupon?.usage?.totalLimit;
  const used = coupon?.usage?.currentUsage ?? 0;
  const hasCap = typeof limit === "number" && limit > 0;

  return {
    elapsedPercent: Math.min(100, Math.max(0, Math.round(elapsed))),
    endsAt: now.getTime() < end ? endsAt : null,
    claimedPercent: hasCap ? Math.min(100, Math.round((used / limit) * 100)) : null,
    claimedLabel: hasCap ? `${INR.format(used)} of ${INR.format(limit)} claimed` : null,
  };
}
