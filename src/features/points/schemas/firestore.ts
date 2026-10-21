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
  /**
   * Earned on a COMPLETED purchase — the owner's rule, 2026-10-21.
   *
   * 🛑 There was NO earn kind before this. The four original values covered
   * shipping savings, redemption, its reversal and an admin adjustment — so
   * the programme could give points back and take them away but had no way to
   * issue them for a purchase, which is the entire point of it.
   *
   * Awarded at COMPLETION, not at checkout: *"points only get issued on
   * successful purchases after buyer put reviews, then only… they are also
   * assigned if the user [raises] no issues after 7 days of delivery."* So
   * completion has two triggers and they converge on one fact (`completedAt`),
   * which is why the award must be keyed on something written once — see
   * `pointsAwardedAt` on the order.
   *
   * 🛑 The STORE bears it (owner: *"so stores bear it"*), as a discount
   * expense: *"the cost is like a sale discount for getting a repeat customer
   * you get to pay few loss."* It is a deduction term in the payout, never a
   * clawback — `payout-release` is `blockedBy: ["order-complete"]`, so the
   * award is ALWAYS strictly before the payout is computed, by construction
   * rather than by timing luck.
   */
  "purchase_earn",
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
  /**
   * When this batch of points stops being spendable.
   *
   * ## 🛑 PER ENTRY, three months, FIFO on redemption
   *
   * Decision 4. Per-entry rather than a single per-user expiry date because
   * points arrive in batches and each batch has its own clock — a credit earned
   * today must not be shortened by one earned three months ago, and a single
   * date can only express one of those.
   *
   * Redemption consumes OLDEST-FIRST so a buyer never loses points they could
   * have spent. The alternative (newest-first) silently maximises expiry, which
   * is the house always winning by a mechanism nobody announced.
   *
   * Absent on a `redemption`, a `redemption_reversal` and usually on an
   * `admin_adjustment`: a spend has nothing to expire, and a reversal restores
   * points whose original clock has already been consumed — giving it a fresh
   * three months would be a quiet extension nobody granted.
   *
   * 🛑 Absent also means NEVER EXPIRES, which is the right default for every
   * entry written before this field existed. Treating absence as "expired" would
   * retroactively void live balances; treating it as "never" leaves a bounded,
   * knowable residue that the reconciliation job can report.
   */
  expiresAt?: Date;
  /**
   * Points consumed out of this credit by later redemptions.
   *
   * 🛑 FIFO needs to know how much of each batch is left, and an append-only
   * ledger cannot answer that from the sum alone: two credits of 50 and a spend
   * of 60 sum to 40, but WHICH 40 is left decides what expires when. So a
   * redemption writes its negative entry AND increments this counter on the
   * batches it drew from.
   *
   * That makes this the one mutable field on an otherwise append-only row, and
   * it is a deliberate, narrow exception: the alternative is deriving
   * consumption by replaying every entry in order on every read, which is
   * O(ledger) per balance check and gets slower forever.
   */
  consumed?: number;
  /**
   * On a `redemption` only: the credit batches this spend drew from, in the
   * order it drew from them.
   *
   * 🛑 Recorded ON the spend rather than derived later. A reversal needs to know
   * what to give back, and by then those batches may themselves have expired —
   * "return it where it came from" is only answerable if the spend wrote it
   * down. Deriving it afterwards would mean replaying the whole ledger and
   * guessing at a FIFO order that may since have changed.
   */
  drawnFrom?: string[];
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
    case "purchase_earn":
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
  EXPIRES_AT: "expiresAt",
  CONSUMED: "consumed",
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

/**
 * How long a credit stays spendable. Decision 4: three months from issue.
 *
 * 🛑 A tighter bound than inactivity-based expiry on purpose. The liability
 * here is unbounded without one (D49: there is no expiry at all today), and
 * "three months from this batch" is a figure a buyer can check against their
 * own ledger — whereas "twelve months since you last did anything" is a date
 * that moves for reasons they cannot see.
 */
export const POINTS_EXPIRY_MONTHS = 3;

/**
 * Percentage of an order's post-discount GOODS value earned as points.
 *
 * 🛑 GOODS, never the order total. "5% of what you paid" read literally
 * includes shipping and the platform fee — so we would issue points against
 * postage handed to a courier. And it excludes the points TENDER itself, or
 * points breed points: pay ₹100 with points, earn 5, pay with those, earn
 * again. It converges, but it leaks value and is indefensible on a balance
 * sheet.
 */
export const POINTS_EARN_PERCENT = 5;

/**
 * When does a batch of points issued now expire?
 *
 * A function rather than a constant offset because months are not a fixed
 * number of days — `setMonth` handles the 31st-of-a-short-month case the way a
 * human reading "three months" expects, which a `+ 90 * 86400000` does not.
 */
export function pointsExpiryFrom(issuedAt: Date): Date {
  const out = new Date(issuedAt.getTime());
  out.setMonth(out.getMonth() + POINTS_EXPIRY_MONTHS);
  return out;
}
