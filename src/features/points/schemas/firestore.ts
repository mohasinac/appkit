/**
 * Buyer points — 1 point = ₹1, spendable only against a future order.
 *
 * ## 🛑 This is NOT a wallet, and the distinction is legal, not stylistic
 *
 * A wallet holds the customer's money: it can be withdrawn, it is a liability
 * payable in cash, and in India storing redeemable value on behalf of a
 * customer is PPI territory with RBI authorisation attached. Points here are a
 * DISCOUNT ENTITLEMENT — they arise from shipping we charged and did not
 * spend, they can only ever reduce the price of a later order on this site,
 * and they are never payable out.
 *
 * Consequences that must survive every future change:
 *
 *   - no withdrawal path, ever
 *   - no transfer between users
 *   - never refunded as cash when an order is cancelled; points SPENT on a
 *     cancelled order are returned as points
 *   - they do not earn interest and are not a balance the user "owns"
 *
 * ## Why a ledger and not a counter
 *
 * A single `points: number` on the user document cannot answer "where did this
 * come from", cannot be reconciled against the orders that generated it, and
 * loses the audit trail the moment two writes race. Root Cause #102 is the
 * same shape one domain over: a counter that could not express what it was
 * counting silently drifted, and nothing errored because a wrong number is
 * just a number.
 *
 * So: append-only entries, and the balance is their sum. `pointsBalance` on the
 * user document is a derived MIRROR for cheap reads — and per Root Cause #42
 * the reader must be able to fall back to summing the ledger, because a mirror
 * that only one write path maintains will drift.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";

/**
 * Why points moved.
 *
 * 🛑 A closed union with its values enumerated, so a new source is a compile
 * error at every exhaustive read rather than an unlabelled row. The admin
 * answer to "why do I have 53 points" is this field.
 */
export const POINTS_ENTRY_KIND_VALUES = [
  /** Shipping charged minus shipping actually spent, credited after dispatch. */
  "shipping_saving",
  /** Spent against an order's total at checkout. Always negative. */
  "redemption",
  /** A redemption returned because the order it paid for was cancelled. */
  "redemption_reversal",
  /** Manual adjustment by an admin, with a mandatory reason. */
  "admin_adjustment",
] as const;

export type PointsEntryKind = (typeof POINTS_ENTRY_KIND_VALUES)[number];

export interface PointsLedgerEntry extends BaseDocument {
  /** Auth UID of the buyer. The ledger is keyed on the person, not the order. */
  userId: string;
  kind: PointsEntryKind;
  /**
   * Signed, in points (= rupees). Positive credits, negative spends.
   *
   * 🛑 Signed here even though `ShippingReconciliation` deliberately splits its
   * two directions into separate non-negative fields. That split exists so a
   * CALLER cannot misread which way the money went; a ledger is the one place
   * the sign IS the meaning, and summing a column is how a balance is defined.
   */
  amount: number;
  /** The order that caused this entry, when there is one. */
  orderId?: string;
  /**
   * Human-readable, shown to the buyer on their points page.
   *
   * Written at creation rather than derived at render: the explanation names
   * couriers and amounts that are true of that moment, and re-deriving it later
   * from an order that has since been edited would describe something that
   * never happened.
   */
  description: string;
  /** Required for `admin_adjustment`. Never shown to the buyer. */
  adminReason?: string;
  /** Who made an `admin_adjustment`. */
  actorUid?: string;
}

/**
 * The ledger's own invariant, stated once so every writer can be checked
 * against it.
 *
 * A `redemption` must be negative and every other kind must be positive —
 * except `admin_adjustment`, which is the one kind that may go either way and
 * is therefore the one kind that demands a reason.
 */
export function isPointsEntryWellFormed(entry: Pick<PointsLedgerEntry, "kind" | "amount" | "adminReason">): boolean {
  if (!Number.isFinite(entry.amount) || entry.amount === 0) return false;
  switch (entry.kind) {
    case "redemption":
      return entry.amount < 0;
    case "shipping_saving":
    case "redemption_reversal":
      return entry.amount > 0;
    case "admin_adjustment":
      return Boolean(entry.adminReason && entry.adminReason.trim().length >= 10);
  }
}

export const POINTS_LEDGER_COLLECTION = "pointsLedger";

/**
 * Firestore field names for this collection.
 *
 * Declared rather than written as string literals at the query site, matching
 * every other collection here: a typo in a raw `where("userID", ...)` is a
 * query that returns nothing and raises nothing, which on a points balance
 * reads as "you have no points" rather than as a bug.
 */
export const POINTS_FIELDS = {
  ID: "id",
  USER_ID: "userId",
  KIND: "kind",
  AMOUNT: "amount",
  ORDER_ID: "orderId",
  CREATED_AT: "createdAt",
} as const;

/**
 * 🛑 Points cannot pay for the whole order, and this is the cap that enforces
 * it.
 *
 * At 100% a buyer could place a zero-value order, which breaks the payment
 * gateway path (a ₹0 Razorpay order is not a thing), makes COD meaningless,
 * and turns a discount entitlement into something that behaves exactly like
 * stored value — the one property this feature must not have. A ceiling keeps
 * every order a real transaction.
 */
export const POINTS_MAX_REDEMPTION_PERCENT = 50;

/**
 * How many points may be spent on an order of this value.
 *
 * Floors to whole points: a fractional point is not something a user can be
 * shown or reason about, and rounding UP would spend a point that was never
 * credited.
 */
export function maxRedeemablePoints(orderTotal: number, balance: number): number {
  if (!Number.isFinite(orderTotal) || orderTotal <= 0) return 0;
  if (!Number.isFinite(balance) || balance <= 0) return 0;
  // audit-money-units-ok: a percentage of an order total, not a paise/rupee conversion
  const cap = Math.floor((orderTotal * POINTS_MAX_REDEMPTION_PERCENT) / 100);
  return Math.max(0, Math.min(Math.floor(balance), cap));
}
