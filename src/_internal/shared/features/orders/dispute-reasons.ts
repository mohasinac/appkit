/**
 * Dispute KINDS and the gate each one must pass.
 *
 * ## Why the kind is closed and the reason list is not
 *
 * The owner's two rules are policy:
 *
 * > An item dispute can only be raised after the order was received. A
 * > "not reached" dispute is allowed once the ETD is more than 3 days past.
 *
 * A gate cannot branch on a user-created string. `return-reasons.ts` already
 * makes this argument in its own header — *"'No returns, unless the buyer
 * didn't get what they paid for' is not a policy that can be enforced against
 * a free-text box: it needs a machine-readable statement of what went
 * wrong"* — and it applies with more force here, because these two gates are
 * MUTUALLY EXCLUSIVE.
 *
 * So there are two levels:
 *
 * 1. **`DisputeKind` — closed, here, two values.** It picks the gate.
 * 2. **`disputeReasons` — a staff-creatable Firestore collection.** Every row
 *    carries a `kind`, so a new reason inherits an existing gate and cannot
 *    invent one. That list is for triage and analytics, never for policy.
 *
 * ## What this replaces
 *
 * `raiseOrderDisputeAction` took `reason: string` and checked only that it was
 * non-empty. So today a buyer can file "it never arrived" on an order that was
 * delivered last week, and "it arrived damaged" on one still in transit — both
 * nonsense, both accepted, and both raising a `severity: "error"` fraud-category
 * admin alert. The gate is the point of this file.
 */

import type { OrderDocument } from "../../../../features/orders/schemas/firestore";

export const DISPUTE_KIND = ["item", "not_reached"] as const;

export type DisputeKind = (typeof DISPUTE_KIND)[number];

/**
 * 🛑 `Record<DisputeKind, string>`, so a third kind is a COMPILE error here
 * rather than a dispute that renders `undefined` and passes no gate.
 */
export const DISPUTE_KIND_LABEL: Record<DisputeKind, string> = {
  item: "There's a problem with what I received",
  not_reached: "My order hasn't arrived",
};

export function isDisputeKind(value: unknown): value is DisputeKind {
  return typeof value === "string" && (DISPUTE_KIND as readonly string[]).includes(value);
}

/**
 * How long after dispatch a parcel is ASSUMED to have been deliverable, when
 * the courier gave us no estimate.
 *
 * 🛑 This exists so the `not_reached` gate is reachable AT ALL. There is no
 * courier ETD on an order today: nothing platform-books (`createShipment` has
 * zero callers), and a self-shipping seller types a tracking number with no
 * estimate attached. Gate solely on a stored ETD and no buyer could ever file
 * a non-delivery dispute — a gate nobody can pass is the same as no feature.
 *
 * Published through `PublishedValueKey` so the policy page and this gate
 * cannot disagree (Phase 9).
 */
export const DISPUTE_TRANSIT_WINDOW_DAYS = 7;

/**
 * The owner's "more than 3 days" grace, measured from the ETD.
 *
 * Separate from the transit window on purpose: one is "when should it have
 * arrived", the other is "how long after that before we believe it is lost".
 * Folding them into a single 10 would make neither number explicable on a
 * policy page.
 */
export const DISPUTE_NOT_REACHED_GRACE_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fields the gates read. Narrow, so a caller need not hold a whole order. */
export interface DisputeGateOrder {
  deliveryDate?: Date | null;
  completedAt?: Date | null;
  shippingDate?: Date | null;
  estimatedDeliveryDate?: Date | null;
}

export type DisputeGateResult =
  | { allowed: true }
  /** `message` is buyer-facing and must name the next action, not just refuse. */
  | { allowed: false; message: string };

function asDate(v: Date | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

function fmt(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * The effective ETD, and WHY we think so.
 *
 * Exported because the buyer-facing form needs to show the date they can file
 * from — telling someone "not yet" without saying when is a dead end.
 */
export function resolveDisputeEtd(
  order: DisputeGateOrder,
  transitWindowDays = DISPUTE_TRANSIT_WINDOW_DAYS,
): { etd: Date; source: "courier" | "assumed" } | null {
  const courier = asDate(order.estimatedDeliveryDate);
  if (courier) return { etd: courier, source: "courier" };

  const shipped = asDate(order.shippingDate);
  if (shipped) {
    return { etd: new Date(shipped.getTime() + transitWindowDays * DAY_MS), source: "assumed" };
  }
  return null;
}

/** The date from which a `not_reached` dispute becomes filable. */
export function disputeNotReachedFilableFrom(
  order: DisputeGateOrder,
  graceDays = DISPUTE_NOT_REACHED_GRACE_DAYS,
): Date | null {
  const resolved = resolveDisputeEtd(order);
  if (!resolved) return null;
  return new Date(resolved.etd.getTime() + graceDays * DAY_MS);
}

/**
 * 🛑 `Record<DisputeKind, …>`. A third kind cannot be added without deciding
 * what gates it — which is the whole reason the kind is closed.
 */
export const DISPUTE_GATE: Record<
  DisputeKind,
  (order: DisputeGateOrder, now?: Date) => DisputeGateResult
> = {
  /**
   * You cannot judge an item you have not seen.
   *
   * `completedAt` counts as well as `deliveryDate`: a buyer who pressed "Mark
   * complete" has told us they received it, and refusing them because no
   * courier scan landed would be refusing the more reliable signal of the two.
   */
  item: (order) => {
    if (asDate(order.deliveryDate) || asDate(order.completedAt)) return { allowed: true };
    return {
      allowed: false,
      message:
        "You can report a problem with an item once it arrives. If it hasn't arrived, raise a delivery issue instead.",
    };
  },

  /**
   * Only valid BEFORE receipt, and only once the parcel is genuinely late.
   *
   * Three refusals, each pointing somewhere:
   *  - delivered → the wrong kind; offer the item route or a return.
   *  - never dispatched → not a courier problem at all. That is the
   *    `seller-dispatch` obligation's job, and it is already running.
   *  - too early → say the date, not just "not yet".
   */
  not_reached: (order, now = new Date()) => {
    const delivered = asDate(order.deliveryDate);
    if (delivered) {
      return {
        allowed: false,
        message: `This order was marked delivered on ${fmt(delivered)}. If something is wrong with what arrived, report a problem with the item instead.`,
      };
    }

    if (!asDate(order.shippingDate) && !asDate(order.estimatedDeliveryDate)) {
      return {
        allowed: false,
        message:
          "This order hasn't been dispatched yet, so there's nothing in transit to chase. We already track late dispatch and will act on it without you needing to do anything.",
      };
    }

    const filableFrom = disputeNotReachedFilableFrom(order);
    if (!filableFrom) {
      // Unreachable given the check above; kept rather than asserted, because
      // a thrown non-null assertion here would be a 500 on a buyer action.
      return {
        allowed: false,
        message: "We can't work out an expected delivery date for this order yet. Contact support.",
      };
    }

    if (now.getTime() < filableFrom.getTime()) {
      return {
        allowed: false,
        message: `It's still within the expected delivery window. If it hasn't arrived by ${fmt(filableFrom)}, you can raise a delivery issue then.`,
      };
    }

    return { allowed: true };
  },
};

/** Convenience wrapper so callers do not index the record by hand. */
export function checkDisputeGate(
  kind: DisputeKind,
  order: DisputeGateOrder,
  now?: Date,
): DisputeGateResult {
  return DISPUTE_GATE[kind](order, now);
}

/**
 * Narrow an `OrderDocument` to what the gates read.
 *
 * 🛑 Exists so a caller never passes the whole document into something that
 * then travels further — the gate result is what crosses a boundary, not the
 * order (Root Cause #70).
 */
export function toDisputeGateOrder(order: OrderDocument): DisputeGateOrder {
  return {
    deliveryDate: order.deliveryDate ?? null,
    completedAt: order.completedAt ?? null,
    shippingDate: order.shippingDate ?? null,
    estimatedDeliveryDate: order.estimatedDeliveryDate ?? null,
  };
}
