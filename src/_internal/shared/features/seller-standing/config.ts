/**
 * Seller standing — the ONE definition of what earns the Trusted Seller tier.
 *
 * ## Why this is a single pure module
 *
 * Four surfaces must agree about the criteria: the monthly rollup job that
 * grants and revokes, the seller's in-dashboard progress panel, the public
 * `/seller-guide` criteria table, and the admin trust guide. Four hand-written
 * copies of "25 delivered orders in 90 days" is Root Cause #73/#75's shape —
 * the copy that gets fixed is never the copy the reader believes. So the
 * thresholds, the predicate AND the display rows all come from here.
 *
 * 🛑 It had a fifth copy before this existed, and it was prose:
 * `AdminStoresGuideView` told admins the verified badge was "awarded when the
 * store has a consistent track record (>=20 delivered orders, >=4.0 rating, 3+
 * months active)" — numbers no code has ever read, attached to a field nothing
 * computes. That sentence is what the whole feature was remembered as being.
 *
 * ## Pure, and that is load-bearing
 *
 * No Firestore, no clock, no `Date.now()`. The job passes in metrics it has
 * already measured and the UI passes in metrics it has already loaded, so the
 * same input always produces the same verdict and the panel can never disagree
 * with the grant.
 */

// ---------------------------------------------------------------------------
// Criteria
// ---------------------------------------------------------------------------

/**
 * 🛑 A `Record<Criterion, true>`, not a string array.
 *
 * Adding a criterion then becomes a COMPILE error at every site that must
 * display or evaluate it — the thresholds, the labels, the verdict's `met`
 * map. An array lets a new criterion be evaluated while silently rendering
 * nowhere, which is how ten hand-maintained enumerations of one union drifted
 * in Root Cause #61.
 */
const SELLER_STANDING_CRITERION_MAP = {
  deliveredOrders: true,
  distinctBuyers: true,
  distinctAddresses: true,
  ratedOrders: true,
  averageRating: true,
} as const;

export type SellerStandingCriterion = keyof typeof SELLER_STANDING_CRITERION_MAP;

export const SELLER_STANDING_CRITERIA = Object.keys(
  SELLER_STANDING_CRITERION_MAP,
) as SellerStandingCriterion[];

/** The two tiers. Ordered: `trusted` is strictly above `seller`. */
export type SellerTier = "seller" | "trusted";

export const SELLER_TIER = {
  SELLER: "seller",
  TRUSTED: "trusted",
} as const;

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

export interface SellerStandingThresholds {
  /** The rolling window every metric is measured over. */
  windowDays: number;
  minDeliveredOrders: number;
  minDistinctBuyers: number;
  minDistinctAddresses: number;
  minRatedOrders: number;
  /** A mean, 1–5. Compared with `>=`. */
  minAverageRating: number;
}

/**
 * The shipped defaults.
 *
 * 🛑 Every count is measured INSIDE `windowDays`, not lifetime. That is the
 * strict reading and it was chosen deliberately: the tier grants early payout,
 * so it has to describe a seller who is shipping reliably *now*, not one who
 * did two years ago. The consequence worth knowing up front is that on a
 * freshly seeded catalogue **nobody qualifies**, and that is the correct
 * result rather than a broken job.
 *
 * Admin-overridable via `siteSettings.sellerStanding` so the bar can be tuned
 * once real volume exists, without a deploy.
 */
export const SELLER_STANDING_DEFAULTS: SellerStandingThresholds = {
  windowDays: 90,
  minDeliveredOrders: 25,
  minDistinctBuyers: 25,
  minDistinctAddresses: 25,
  minRatedOrders: 25,
  minAverageRating: 4,
};

/**
 * Fold a partial admin override onto the defaults.
 *
 * 🛑 Per-field, not `?? DEFAULTS`. A settings document that carries only
 * `windowDays` must keep every other default rather than collapsing the whole
 * object — the half-set case is the normal one for an admin who changed one
 * number.
 */
export function resolveSellerStandingThresholds(
  override?: Partial<SellerStandingThresholds> | null,
): SellerStandingThresholds {
  if (!override) return { ...SELLER_STANDING_DEFAULTS };
  const merged = { ...SELLER_STANDING_DEFAULTS };
  for (const key of Object.keys(merged) as (keyof SellerStandingThresholds)[]) {
    const value = override[key];
    /*
     * A non-finite or negative override is ignored rather than honoured. An
     * admin typing "-1" into a threshold would otherwise make the criterion
     * trivially true and auto-grant early payout to every store — the one
     * failure mode of this feature that moves money.
     */
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      merged[key] = value;
    }
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Metrics + verdict
// ---------------------------------------------------------------------------

export interface SellerStandingMetrics {
  /** Delivered orders inside the window, excluding self-bought and test rows. */
  deliveredOrders: number;
  /** Distinct buyer uids across those orders. */
  distinctBuyers: number;
  /** Distinct shipping-address fingerprints across those orders. */
  distinctAddresses: number;
  /** Approved reviews inside the window. */
  ratedOrders: number;
  /** Mean of those reviews' ratings, 1–5. `0` when there are none. */
  averageRating: number;
}

export interface SellerStandingVerdict {
  tier: SellerTier;
  met: Record<SellerStandingCriterion, boolean>;
  /** How many criteria are still short — drives "1 criterion to go". */
  unmetCount: number;
}

/**
 * Does this seller currently meet the bar?
 *
 * 🛑 ALL criteria must hold. There is no scoring and no partial credit: the
 * reward is being paid before delivery, so "mostly reliable" is not a state
 * this can grant on.
 */
export function evaluateSellerStanding(
  metrics: SellerStandingMetrics,
  thresholds: SellerStandingThresholds = SELLER_STANDING_DEFAULTS,
): SellerStandingVerdict {
  const met: Record<SellerStandingCriterion, boolean> = {
    deliveredOrders: metrics.deliveredOrders >= thresholds.minDeliveredOrders,
    distinctBuyers: metrics.distinctBuyers >= thresholds.minDistinctBuyers,
    distinctAddresses: metrics.distinctAddresses >= thresholds.minDistinctAddresses,
    ratedOrders: metrics.ratedOrders >= thresholds.minRatedOrders,
    averageRating: metrics.averageRating >= thresholds.minAverageRating,
  };
  const unmetCount = SELLER_STANDING_CRITERIA.filter((c) => !met[c]).length;
  return {
    tier: unmetCount === 0 ? SELLER_TIER.TRUSTED : SELLER_TIER.SELLER,
    met,
    unmetCount,
  };
}

// ---------------------------------------------------------------------------
// Display — so the panel, the public guide and the admin guide agree
// ---------------------------------------------------------------------------

export const SELLER_STANDING_CRITERION_LABELS: Record<SellerStandingCriterion, string> = {
  deliveredOrders: "Delivered orders",
  distinctBuyers: "Different buyers",
  distinctAddresses: "Different delivery addresses",
  ratedOrders: "Rated orders",
  averageRating: "Average rating",
};

/**
 * Why each criterion exists, in the seller's words. Rendered on the guide
 * pages — a bar with no stated reason reads as arbitrary, and two of these
 * exist specifically to make the tier hard to manufacture.
 */
export const SELLER_STANDING_CRITERION_WHY: Record<SellerStandingCriterion, string> = {
  deliveredOrders: "Enough completed sales to show a pattern, not a one-off.",
  distinctBuyers: "Sales to real, different customers.",
  distinctAddresses: "Orders going to different places, not the same one repeatedly.",
  ratedOrders: "Enough ratings for the average below to mean something.",
  averageRating: "Buyers are consistently happy with what arrives.",
};

export type SellerStandingRowKind = "count" | "rating";

export interface SellerStandingRow {
  criterion: SellerStandingCriterion;
  label: string;
  why: string;
  kind: SellerStandingRowKind;
  /** The seller's current figure. `null` when standing has never been computed. */
  actual: number | null;
  target: number;
  met: boolean;
}

function targetFor(
  criterion: SellerStandingCriterion,
  t: SellerStandingThresholds,
): number {
  switch (criterion) {
    case "deliveredOrders":
      return t.minDeliveredOrders;
    case "distinctBuyers":
      return t.minDistinctBuyers;
    case "distinctAddresses":
      return t.minDistinctAddresses;
    case "ratedOrders":
      return t.minRatedOrders;
    case "averageRating":
      return t.minAverageRating;
  }
}

/**
 * One row per criterion, for rendering.
 *
 * `metrics` may be null — a store whose standing has never been computed shows
 * every target with no figure beside it, which is honest. 🛑 It must NOT show
 * zeros: a confident "0 of 25" on a store that simply has not been measured
 * yet is the same lie as a counter that has never been written reading as 0
 * (Root Cause #72).
 */
export function sellerStandingRows(
  metrics: SellerStandingMetrics | null | undefined,
  thresholds: SellerStandingThresholds = SELLER_STANDING_DEFAULTS,
): SellerStandingRow[] {
  const verdict = metrics ? evaluateSellerStanding(metrics, thresholds) : null;
  return SELLER_STANDING_CRITERIA.map((criterion) => ({
    criterion,
    label: SELLER_STANDING_CRITERION_LABELS[criterion],
    why: SELLER_STANDING_CRITERION_WHY[criterion],
    kind: criterion === "averageRating" ? ("rating" as const) : ("count" as const),
    actual: metrics ? metrics[criterion] : null,
    target: targetFor(criterion, thresholds),
    met: verdict ? verdict.met[criterion] : false,
  }));
}

/** `4` → `"4.0"`, `25` → `"25"`. Keeps rating and count formatting in one place. */
export function formatSellerStandingValue(
  value: number,
  kind: SellerStandingRowKind,
): string {
  return kind === "rating" ? value.toFixed(1) : String(value);
}
