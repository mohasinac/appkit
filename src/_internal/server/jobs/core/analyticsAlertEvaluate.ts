/**
 * Core: evaluate the alert rules sellers and admins have configured — C3b.
 *
 * ## 🛑 The defect this closes: there was no evaluator at all
 *
 * `analyticsAlerts` had a schema, a seller CRUD UI, two API routes and four
 * seeded fixtures — and **zero references across all 59 job files and
 * `functions/`**. `lastTriggeredAt` was declared and written nowhere. So every
 * alert a seller configured, and every one the seed created, could never fire.
 *
 * CLAUDE.md overstates this feature for exactly that reason: the parts that
 * exist look complete, and the one that was missing is the one nothing points
 * at. It also hid the metric-vocabulary split that C3a closed — two disjoint
 * lists of metric names cannot be noticed while nothing reads the field.
 *
 * ## The switch is EXHAUSTIVE over `AlertMetric`
 *
 * `satisfies never` on the default branch, so adding a vocabulary member
 * without an implementation does not compile. That is the mechanism behind the
 * vocabulary's rule — *a metric is offerable only if the evaluator computes
 * it* — rather than a convention someone has to remember.
 *
 * ## Read cost, and why it is bounded
 *
 * Metrics are computed ONCE PER OWNER, not once per alert: a seller with four
 * alerts on orders pays for one orders query. Each query is bounded by
 * `QUERY_LIMIT` and every count is reported as saturated when it hits the cap,
 * because a count that silently stopped at 500 is a threshold comparison
 * against a number that is not the number.
 *
 * 🛑 It does NOT scan per-product for `low_stock`. `availableQuantity <= N` is
 * an inequality, and pairing one with an arbitrary sort is what demands an
 * index nobody declares (Root Cause #59) — so the window is bounded and the
 * predicate runs in memory, the same asymmetry § Availability describes.
 */

import { serverLogger } from "../../../../monitoring";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { normalizeError } from "../../../../errors/normalize";
import {
  ORDER_FIELDS,
  PAYOUT_FIELDS,
  PRODUCT_FIELDS,
} from "../../../../constants/field-names";
import {
  ProductStatusValues,
  PRODUCT_COLLECTION,
} from "../../../../features/products/schemas/firestore";
import { ANALYTICS_ALERTS_COLLECTION } from "../../../../features/store-extensions/schemas/firestore";
import {
  ALERT_METRICS,
  LOW_STOCK_THRESHOLD,
  type AlertMetric,
} from "../../../../features/store-extensions/constants/alert-metrics";
import type {
  AlertOperator,
  AnalyticsAlertDocument,
} from "../../../../features/store-extensions/schemas/firestore";
import type { JobContext } from "../runtime/types";

/** Bound on every count query. Reported when it saturates. */
const QUERY_LIMIT = 500;

/*
 * Collection names and the two field names that have no entry in
 * `constants/field-names.ts`.
 *
 * Declared here rather than inlined at the call site because
 * `audit-registry-constants` is right about the general rule — a hand-typed
 * field name in a query clause is how a rename passes a typecheck and returns
 * zero rows. These two (`reports.status`, `analyticsAlerts.isActive`) belong
 * in the shared registry the day a second reader appears; one local constant
 * is the honest intermediate rather than adding a registry entry nothing else
 * uses.
 */
const ORDERS_COLLECTION = "orders";
const REVIEWS_COLLECTION = "reviews";
const PAYOUTS_COLLECTION = "payouts";
const REPORTS_COLLECTION = "reports";
const USERS_COLLECTION = "users";
const REPORT_STATUS_FIELD = "status";
const ANALYTICS_ALERT_IS_ACTIVE_FIELD = "isActive";

/**
 * An alert that is still true must not re-notify every run.
 *
 * Without this a seller with five products below five units gets a mail every
 * hour until they restock — and the first thing anyone does with a channel
 * that cries wolf is mute it, which costs the alerts that matter.
 */
const RENOTIFY_COOLDOWN_HOURS = 24;

interface AlertOwnerBucket {
  scope: "seller" | "admin";
  ownerId: string;
  alerts: AnalyticsAlertDocument[];
}

/** Compare, with the operator the alert carries. */
export function alertFires(
  value: number,
  operator: AlertOperator,
  threshold: number,
): boolean {
  switch (operator) {
    case ">":
      return value > threshold;
    case "<":
      return value < threshold;
    case ">=":
      return value >= threshold;
    case "<=":
      return value <= threshold;
    case "==":
      return value === threshold;
    case "!=":
      return value !== threshold;
    default: {
      /*
       * Exhaustive. A seventh operator would not compile rather than silently
       * never firing — which is the failure mode of a `default: return false`
       * and is how an alert can look configured and be inert.
       */
      const unreachable: never = operator;
      return unreachable;
    }
  }
}

/**
 * Whether enough time has passed to notify again.
 *
 * An alert that has NEVER fired always notifies — absence of
 * `lastTriggeredAt` means "not yet", never "recently".
 */
export function mayRenotify(alert: AnalyticsAlertDocument, now: Date): boolean {
  if (!alert.lastTriggeredAt) return true;
  const last = new Date(alert.lastTriggeredAt).getTime();
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= RENOTIFY_COOLDOWN_HOURS * 60 * 60 * 1000;
}

/** Everything one owner's alerts might need, computed at most once each. */
interface MetricCache {
  get(metric: AlertMetric, windowHours: number): Promise<number>;
}

interface CountResult {
  value: number;
  saturated: boolean;
}

interface CompletedOrderLike {
  paymentStatus?: string;
  refunds?: unknown[];
  items?: { quantity?: number; cancelledQuantity?: number; unitPrice?: number }[];
}

/**
 * 🛑 GOODS VALUE of a completed order, never `totalPrice`.
 *
 * C0 established that the grand total folds in GST, the platform fee,
 * shipping and add-ons — and an alert reporting a seller's revenue as the
 * buyer's grand total tells them they earned money we collected on somebody
 * else's behalf. This is the same base a payout is computed from.
 *
 * An unpaid or refunded order contributes **zero**: delivered-then-refunded
 * has a realised value of nothing, which is the same rule `priceIndexRollup`
 * applies to the index.
 *
 * Extracted because `audit-code-quality` flagged the inline version at
 * brace-depth 6 and it was right — "for each order, if paid, if not refunded,
 * for each item, if live" is four questions in one block.
 */
function completedOrderGoodsValue(order: CompletedOrderLike): number {
  if (order.paymentStatus !== "paid") return 0;
  if (order.refunds && order.refunds.length > 0) return 0;
  return (order.items ?? []).reduce((sum, it) => {
    const live = (it.quantity ?? 0) - (it.cancelledQuantity ?? 0);
    return live > 0 ? sum + live * (it.unitPrice ?? 0) : sum;
  }, 0);
}

function buildMetricCache(
  ctx: JobContext,
  bucket: AlertOwnerBucket,
  now: Date,
  onSaturated: (metric: AlertMetric) => void,
): MetricCache {
  const cache = new Map<string, Promise<number>>();

  const since = (windowHours: number) =>
    new Date(now.getTime() - windowHours * 60 * 60 * 1000);

  /** A bounded count, flagged when it hits the cap. */
  const boundedCount = async (
    build: () => ReturnType<typeof buildQuery>,
  ): Promise<CountResult> => {
    const snap = await build().limit(QUERY_LIMIT).get();
    return { value: snap.size, saturated: snap.size >= QUERY_LIMIT };
  };

   
  type Q = any;
  function buildQuery(): Q {
    return ctx.db.collection(PRODUCT_COLLECTION);
  }

  /** Seller metrics scope to the store; admin metrics span the platform. */
  const storeScoped = (q: Q): Q =>
    bucket.scope === "seller" ? q.where(PRODUCT_FIELDS.STORE_ID, "==", bucket.ownerId) : q;

  const compute = async (metric: AlertMetric, windowHours: number): Promise<number> => {
    switch (metric) {
      case "low_stock": {
        /*
         * Bounded fetch + in-memory predicate, never `availableQuantity <= N`
         * in the query. An inequality pushed alongside any other clause
         * demands a composite index in an order nobody declares, and the
         * failure mode is `FAILED_PRECONDITION` swallowed into a zero —
         * i.e. an alert that silently never fires (Root Cause #59).
         */
        const snap = await storeScoped(
          ctx.db.collection(PRODUCT_COLLECTION).where(PRODUCT_FIELDS.STATUS, "==", ProductStatusValues.PUBLISHED),
        )
          .limit(QUERY_LIMIT)
          .get();
        if (snap.size >= QUERY_LIMIT) onSaturated(metric);
        return snap.docs.filter((d: { data: () => unknown }) => {
          const q = (d.data() as { availableQuantity?: number }).availableQuantity ?? 0;
          return q > 0 && q <= LOW_STOCK_THRESHOLD;
        }).length;
      }
      case "out_of_stock": {
        const snap = await storeScoped(
          ctx.db.collection(PRODUCT_COLLECTION).where(PRODUCT_FIELDS.STATUS, "==", ProductStatusValues.PUBLISHED),
        )
          .limit(QUERY_LIMIT)
          .get();
        if (snap.size >= QUERY_LIMIT) onSaturated(metric);
        return snap.docs.filter(
          (d: { data: () => unknown }) =>
            ((d.data() as { availableQuantity?: number }).availableQuantity ?? 0) <= 0,
        ).length;
      }
      case "orders_count": {
        const r = await boundedCount(() =>
          storeScoped(
            ctx.db.collection(ORDERS_COLLECTION).where(ORDER_FIELDS.CREATED_AT, ">=", since(windowHours)),
          ),
        );
        if (r.saturated) onSaturated(metric);
        return r.value;
      }
      case "cancelled_orders": {
        const r = await boundedCount(() =>
          storeScoped(
            ctx.db
              .collection("orders")
              .where(ORDER_FIELDS.STATUS, "==", ORDER_FIELDS.STATUS_VALUES.CANCELLED)
              .where(ORDER_FIELDS.CREATED_AT, ">=", since(windowHours)),
          ),
        );
        if (r.saturated) onSaturated(metric);
        return r.value;
      }
      case "revenue_total": {
        const snap = await storeScoped(
          ctx.db
            .collection("orders")
            .where(ORDER_FIELDS.STATUS, "==", ORDER_FIELDS.STATUS_VALUES.DELIVERED)
            .where(ORDER_FIELDS.CREATED_AT, ">=", since(windowHours)),
        )
          .limit(QUERY_LIMIT)
          .get();
        if (snap.size >= QUERY_LIMIT) onSaturated(metric);
        /*
         * 🛑 GOODS VALUE, not `totalPrice`. C0 established that the grand
         * total folds in GST, the platform fee, shipping and add-ons — and an
         * alert that reports a seller's revenue as the buyer's grand total
         * tells them they earned money we collected on somebody else's
         * behalf. Same base the payout is computed from.
         */
        const total = snap.docs.reduce(
          (sum: number, d: { data: () => unknown }) =>
            sum + completedOrderGoodsValue(d.data() as CompletedOrderLike),
          0,
        );
        return Math.round(total * 100) / 100;
      }
      case "pending_payout_total": {
        const snap = await (bucket.scope === "seller"
          ? ctx.db.collection(PAYOUTS_COLLECTION).where(PRODUCT_FIELDS.STORE_ID, "==", bucket.ownerId)
          : ctx.db.collection(PAYOUTS_COLLECTION)
        )
          .where(PAYOUT_FIELDS.STATUS, "in", ["PENDING", "PROCESSING"])
          .limit(QUERY_LIMIT)
          .get();
        if (snap.size >= QUERY_LIMIT) onSaturated(metric);
        let total = 0;
        for (const d of snap.docs) total += (d.data() as { amount?: number }).amount ?? 0;
        return Math.round(total * 100) / 100;
      }
      case "avg_rating": {
        const snap = await ctx.db
          .collection("reviews")
          .where(PRODUCT_FIELDS.STORE_ID, "==", bucket.ownerId)
          .limit(QUERY_LIMIT)
          .get();
        if (snap.size >= QUERY_LIMIT) onSaturated(metric);
        const ratings = snap.docs
          .map((d) => (d.data() as { rating?: number }).rating)
          .filter((r): r is number => typeof r === "number");
        /*
         * 🛑 No reviews returns 0, and 0 would FIRE a `< 4` alert — telling a
         * brand-new store its rating has collapsed when it has no rating at
         * all. `NaN` instead, which every comparison answers false to, so the
         * alert stays quiet until there is something to judge.
         */
        if (ratings.length === 0) return Number.NaN;
        return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100;
      }
      case "reviews_count": {
        const r = await boundedCount(() =>
          ctx.db
            .collection("reviews")
            .where(PRODUCT_FIELDS.STORE_ID, "==", bucket.ownerId)
            .where(ORDER_FIELDS.CREATED_AT, ">=", since(windowHours)),
        );
        if (r.saturated) onSaturated(metric);
        return r.value;
      }
      case "open_reports": {
        const r = await boundedCount(() =>
          ctx.db.collection(REPORTS_COLLECTION).where(REPORT_STATUS_FIELD, "==", "pending"),
        );
        if (r.saturated) onSaturated(metric);
        return r.value;
      }
      case "pending_moderation": {
        const r = await boundedCount(() =>
          ctx.db.collection(PRODUCT_COLLECTION).where(PRODUCT_FIELDS.STATUS, "==", "in_review"),
        );
        if (r.saturated) onSaturated(metric);
        return r.value;
      }
      default: {
        /*
         * 🛑 Exhaustive over `AlertMetric`. A vocabulary member with no
         * implementation does NOT compile — which is what makes the
         * vocabulary's rule ("offerable only if computable") a mechanism
         * rather than a note. The original feature had the opposite: seven
         * offerable metrics, none computable.
         */
        const unreachable: never = metric;
        return unreachable;
      }
    }
  };

  return {
    get(metric, windowHours) {
      /*
       * Keyed on metric AND window, because two alerts on `orders_count` with
       * 24h and 48h windows are genuinely two different numbers. Keying on the
       * metric alone would serve one alert the other's answer.
       */
      const key = `${metric}:${windowHours}`;
      let p = cache.get(key);
      if (!p) {
        p = compute(metric, windowHours);
        cache.set(key, p);
      }
      return p;
    },
  };
}

/**
 * The owner's contact details, resolved once per owner.
 *
 * 🛑 This is how the seller's `notifyChannels` is HONOURED rather than
 * ignored. `sendNotification` decides email and WhatsApp eligibility itself
 * (type gate → admin allow-list → user prefs → daily budget) and takes no
 * channel list — but it cannot email an address it was not given. So omitting
 * `userEmail` when the seller did not tick email is a real narrowing through
 * the existing gate, with no second channel-routing mechanism invented beside
 * it.
 *
 * The in-app row is always written, which matches the UI: "in-app" is the
 * default channel and there is no way to turn the bell off.
 */
async function resolveOwnerContact(
  ctx: JobContext,
  bucket: AlertOwnerBucket,
): Promise<{ email?: string; phone?: string }> {
  /*
   * A seller alert's `ownerId` is the OWNER'S UID (the seed writes
   * `user-tyson-blader`), not the store slug — unlike the metric queries
   * above, which scope on `storeId`. Those are two different identifiers and
   * conflating them is Root Cause #98's shape, so they are read from two
   * different places on purpose.
   */
  const snap = await ctx.db.collection(USERS_COLLECTION).doc(bucket.ownerId).get();
  if (!snap.exists) return {};
  const u = snap.data() as { email?: string; phoneNumber?: string };
  return {
    ...(u.email ? { email: u.email } : {}),
    ...(u.phoneNumber ? { phone: u.phoneNumber } : {}),
  };
}

export async function runAnalyticsAlertEvaluate(ctx: JobContext): Promise<void> {
  const now = new Date();

  const snap = await ctx.db
    .collection("analyticsAlerts")
    .where(ANALYTICS_ALERT_IS_ACTIVE_FIELD, "==", true)
    .limit(QUERY_LIMIT)
    .get();
  if (snap.size >= QUERY_LIMIT) {
    ctx.logger.warn("analyticsAlertEvaluate: alert scan saturated — some alerts were not evaluated", {
      limit: QUERY_LIMIT,
    });
  }

  /* Group by owner so each metric is computed once, not once per alert. */
  const buckets = new Map<string, AlertOwnerBucket>();
  for (const d of snap.docs) {
    const alert = { id: d.id, ...(d.data() as object) } as AnalyticsAlertDocument;
    if (!alert.ownerId || !ALERT_METRICS[alert.metric]) {
      /*
       * A stored metric outside the vocabulary. Logged rather than skipped
       * silently: these are the pre-C3a rows, and the only other way to see
       * one is that the seller's list renders a raw token with no description.
       */
      serverLogger.warn("analyticsAlertEvaluate: alert carries an unknown metric", {
        alertId: d.id,
        metric: alert.metric,
      });
      continue;
    }
    const key = `${alert.scope}:${alert.ownerId}`;
    const bucket = buckets.get(key) ?? { scope: alert.scope, ownerId: alert.ownerId, alerts: [] };
    bucket.alerts.push(alert);
    buckets.set(key, bucket);
  }

  let evaluated = 0;
  let fired = 0;
  let suppressed = 0;
  let errored = 0;

  for (const bucket of buckets.values()) {
    const saturatedMetrics = new Set<AlertMetric>();
    const cache = buildMetricCache(ctx, bucket, now, (m) => saturatedMetrics.add(m));
    /** One read per owner, and only when something actually fires. */
    let contact: { email?: string; phone?: string } | null = null;

    const notifyOwner = async (
      b: AlertOwnerBucket,
      alert: AnalyticsAlertDocument,
      value: number,
    ): Promise<void> => {
      contact ??= await resolveOwnerContact(ctx, b);
      const def = ALERT_METRICS[alert.metric];
      await sendNotification({
        /*
         * `system`, deliberately, rather than a new `analytics_alert` type.
         *
         * A new type touches five maps and — more to the point — would need an
         * `EMAIL_ELIGIBLE_TYPES` answer. Against a 100/day Resend ceiling, an
         * email-eligible type driven by a user-configurable threshold is the
         * fastest way to exhaust the allowance. `system` is already eligible
         * and already carries operational messages, which is what this is.
         */
        type: "system",
        userId: b.ownerId,
        title: alert.label || def.label,
        priority: "normal",
        message: `${def.label} is ${value} (${alert.operator} ${alert.threshold} over the last ${alert.windowHours}h). ${def.describes}`,
        ...(alert.notifyChannels?.includes("email") && contact.email
          ? { userEmail: contact.email }
          : {}),
        ...(alert.notifyChannels?.includes("whatsapp") && contact.phone
          ? { userPhone: contact.phone }
          : {}),
        audience: b.scope === "admin" ? "admin" : "seller",
      });
    };

    for (const alert of bucket.alerts) {
      try {
        const value = await cache.get(alert.metric, alert.windowHours ?? 24);
        evaluated += 1;

        /*
         * 🛑 A SATURATED count must not fire. The real number is at least the
         * cap, so a `<` comparison against it is meaningless and a `>` one is
         * true for the wrong reason. Reporting "we could not measure this" is
         * the honest outcome — the same rule as `truncated` rendering "50+"
         * rather than a false total.
         */
        if (saturatedMetrics.has(alert.metric)) {
          suppressed += 1;
          ctx.logger.warn("analyticsAlertEvaluate: skipped on a saturated metric", {
            alertId: alert.id,
            metric: alert.metric,
          });
          continue;
        }
        if (Number.isNaN(value)) {
          suppressed += 1;
          continue;
        }
        if (!alertFires(value, alert.operator, alert.threshold)) continue;
        if (!mayRenotify(alert, now)) {
          suppressed += 1;
          continue;
        }

        /*
         * The write happens FIRST, before the notification.
         *
         * If the notification throws, the cooldown has still been recorded —
         * so a persistently failing channel cannot turn into one attempt per
         * run forever. The inverse order would retry a broken WhatsApp send
         * every hour against a 100/day email allowance.
         */
        await ctx.db
          .collection("analyticsAlerts")
          .doc(alert.id)
          .update({ lastTriggeredAt: now, lastObservedValue: value, updatedAt: now });
        fired += 1;

        await notifyOwner(bucket, alert, value);

        ctx.logger.info("analyticsAlertEvaluate: alert fired", {
          alertId: alert.id,
          ownerId: alert.ownerId,
          metric: alert.metric,
          value,
          operator: alert.operator,
          threshold: alert.threshold,
        });
      } catch (err) {
        const e = normalizeError(err);
        errored += 1;
        ctx.logger.error("analyticsAlertEvaluate: alert evaluation failed", {
          alertId: alert.id,
          metric: alert.metric,
          message: e.message,
        });
      }
    }
  }

  ctx.logger.info("analyticsAlertEvaluate: complete", {
    owners: buckets.size,
    evaluated,
    fired,
    suppressed,
    errored,
  });
}
