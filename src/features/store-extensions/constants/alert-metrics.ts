/**
 * ONE alert-metric vocabulary — C3a.
 *
 * ## The defect this closes
 *
 * `AnalyticsAlertDocument.metric` was `z.string()`, and the two places that
 * produce one shared **ZERO tokens**:
 *
 *   the seller UI offered  daily_revenue · daily_orders · low_stock ·
 *                          cancelled_orders · pending_payouts · avg_rating ·
 *                          reviews_count          (7, snake_case)
 *   the seed wrote         min-stock · orders-window · api-error-rate ·
 *                          reports-1h             (4, kebab-case)
 *
 * Not a near-miss — no value in one list appears in the other. And because
 * nothing validated the field, every seeded alert rendered its raw string in
 * the seller's list (`METRIC_OPTIONS.find(...)?.label ?? alert.metric`) while
 * every alert a seller created was equally unrecognised by anything else.
 *
 * It stayed invisible for one reason: **nothing read either value**. There was
 * no evaluator anywhere — zero references across all 59 job files and
 * `functions/` — so `lastTriggeredAt` was declared and written nowhere, and
 * sellers configured alerts that could never fire.
 *
 * ## 🛑 The rule that keeps it closed
 *
 * **A metric is in this map only if the evaluator computes it.** Offering one
 * it cannot is how the original dead promise was built — a dropdown is a
 * commitment, and `low_stock` sitting in a picker with no evaluator behind it
 * is worse than its absence, because the seller stops watching their stock.
 *
 * So `ALERT_METRICS` is a `Record<AlertMetric, AlertMetricDef>`: adding a
 * union member without a definition is a compile error, and the evaluator's
 * own switch is exhaustive over the same union, so adding a member without an
 * implementation is a compile error too. Root Cause #61 — a `Record<Union, T>`
 * is compile-safe where an array literal is not, and this vocabulary existed
 * as two array literals.
 */

/** Who may set an alert on this metric. */
export type AlertMetricScope = "seller" | "admin";

/** How to render the threshold the seller types. */
export type AlertMetricUnit = "count" | "currency" | "rating";

export interface AlertMetricDef {
  label: string;
  /** What the number means, so the form can suffix it honestly. */
  unit: AlertMetricUnit;
  /** Which portals may offer it. Seller metrics are evaluated per store. */
  scopes: readonly AlertMetricScope[];
  /**
   * Plain-English statement of what is counted, shown as helper text.
   *
   * Carried because "Daily Orders" does not say whether a cancelled order
   * counts, and an alert whose definition the seller has to guess at is an
   * alert they will not trust when it fires.
   */
  describes: string;
}

export const ALERT_METRIC_VALUES = [
  "low_stock",
  "out_of_stock",
  "orders_count",
  "revenue_total",
  "cancelled_orders",
  "pending_payout_total",
  "avg_rating",
  "reviews_count",
  "open_reports",
  "pending_moderation",
] as const;

export type AlertMetric = (typeof ALERT_METRIC_VALUES)[number];

/**
 * 🛑 `Record<AlertMetric, …>`, not a partial and not an array. A union member
 * with no definition does not compile, and the evaluator switches over the
 * same union exhaustively — so the picker, the evaluator and the stored value
 * cannot drift the way the two array literals did.
 */
export const ALERT_METRICS: Record<AlertMetric, AlertMetricDef> = {
  low_stock: {
    label: "Products low on stock",
    unit: "count",
    scopes: ["seller", "admin"],
    describes:
      "How many of your published listings have available stock at or below 5. With 76–93% of competitor catalogues sold out, restock is the main lifecycle event.",
  },
  out_of_stock: {
    label: "Products out of stock",
    unit: "count",
    scopes: ["seller", "admin"],
    describes: "How many published listings have zero available stock and cannot be bought.",
  },
  orders_count: {
    label: "Orders in the window",
    unit: "count",
    scopes: ["seller", "admin"],
    describes:
      "Orders placed in the window, whatever their status. Set this to `== 0` to be told when nothing is selling.",
  },
  revenue_total: {
    label: "Revenue in the window",
    unit: "currency",
    scopes: ["seller", "admin"],
    describes:
      "Goods value of delivered, paid, unrefunded orders in the window — the same base a payout is computed from, not the grand total.",
  },
  cancelled_orders: {
    label: "Cancelled orders in the window",
    unit: "count",
    scopes: ["seller", "admin"],
    describes: "Orders cancelled in the window.",
  },
  pending_payout_total: {
    label: "Pending payout amount",
    unit: "currency",
    scopes: ["seller", "admin"],
    describes: "Total of payouts not yet marked paid. Not window-scoped — a backlog is a backlog.",
  },
  avg_rating: {
    label: "Average rating",
    unit: "rating",
    scopes: ["seller"],
    describes:
      "Mean of approved reviews across the whole store. Set this to `< 4` to hear about a slide early.",
  },
  reviews_count: {
    label: "New reviews in the window",
    unit: "count",
    scopes: ["seller"],
    describes: "Approved reviews published in the window.",
  },
  open_reports: {
    label: "Open reports",
    unit: "count",
    scopes: ["admin"],
    describes: "Reports awaiting moderation. Replaces the seeded `reports-1h`, which nothing read.",
  },
  pending_moderation: {
    label: "Listings pending review",
    unit: "count",
    scopes: ["admin"],
    describes: "Listings in `in_review`, waiting on a moderator.",
  },
};

/** Narrow an arbitrary stored string. */
export function isAlertMetric(value: unknown): value is AlertMetric {
  return typeof value === "string" && (ALERT_METRIC_VALUES as readonly string[]).includes(value);
}

/**
 * The metrics one portal may offer, derived — never a second hand-written list.
 *
 * That is the whole defect this file closes: the seller picker WAS a
 * hand-written list, and it agreed with nothing.
 */
export function alertMetricsForScope(
  scope: AlertMetricScope,
): { value: AlertMetric; def: AlertMetricDef }[] {
  return ALERT_METRIC_VALUES.filter((m) => ALERT_METRICS[m].scopes.includes(scope)).map((m) => ({
    value: m,
    def: ALERT_METRICS[m],
  }));
}

/**
 * The stock level `low_stock` counts at or below.
 *
 * Exported so the alert, the products-list filter and the dashboard tile agree
 * on what "low" means. Three surfaces each picking their own number is how a
 * seller gets a warning from one and a clean bill from another.
 */
export const LOW_STOCK_THRESHOLD = 5;
