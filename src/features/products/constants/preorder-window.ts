/**
 * The pre-order delivery window — ONE predicate, four enforcement points.
 *
 * ## Why this module exists
 *
 * The 45-day rule has to hold at four places with three different input
 * shapes, and every one of them used to be unbounded:
 *
 *   | Point                                   | Input shape          |
 *   |-----------------------------------------|----------------------|
 *   | `preOrderInputSchema` (create)          | ISO string           |
 *   | `productUpdateSchema` (update)          | ISO string \| Date   |
 *   | the seller form's section schema        | `<input>` string     |
 *   | `preOrderRule.preflightChecks` (buy)    | stored `Date`        |
 *
 * Four hand-written comparisons is how a rule becomes four rules that
 * disagree — the shape Root Cause #73 and #75 are both about. So the parse,
 * the comparison and the message all live here and the call sites only ask for
 * a verdict.
 *
 * ## 🛑 The window closes at the END of the 45th calendar day (UTC)
 *
 * Not at `now + 45 × 24h`. The seller picks a calendar DAY in a date control
 * whose `max` attribute is a calendar day, so an instant-based cap would
 * refuse the very day the control offered — `now` at 10:00 makes day 45 at
 * 23:59 "46 days away" by instants. Comparing to the end of that day is what
 * makes the client's `max` and the server's refusal the same rule rather than
 * two that nearly agree.
 *
 * `PREORDER_MAX_DELIVERY_DAYS` lives in `_internal/shared/checkout/rules/_limits.ts`
 * with the reason 45 is 45. Import it from there; this module deliberately
 * does not re-export it (Root Cause #18).
 *
 * ## 🛑 Why `features/products/constants/` and not `_internal/shared/`
 *
 * The CONSUMER needs it: `src/validation/request-schemas.ts` is the schema the
 * seller form and `POST /api/admin/products` actually parse through, so the
 * rule has to be importable from outside appkit. `_internal/**` has no package
 * export key (only six hand-picked paths are mapped), while `./features/*` is
 * a wildcard — so this is the layer a shared rule can live in without adding
 * an export key for one module. Same reasoning as the public `features/<x>/
 * actions/` layer in CLAUDE.md's duplication framework: two layers, not two
 * homes for one layer.
 */

import { PREORDER_MAX_DELIVERY_DAYS } from "../../../_internal/shared/checkout/rules/_limits";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * What a candidate delivery date is, against the rule.
 *
 * 🛑 Four cases, not a boolean. A boolean collapses "you typed something that
 * is not a date", "that date has already passed" and "that is further out than
 * we can settle" into one message, and the seller then cannot tell which of
 * three different fixes to apply. `absent` is separate again because an
 * OPTIONAL field being absent is not a failure on the update path — only on
 * create, where the caller decides.
 */
export type PreOrderDeliveryVerdict =
  | "ok"
  | "absent"
  | "unparseable"
  | "past"
  | "beyond-window";

/**
 * The last instant a pre-order created at `now` may promise delivery.
 *
 * End of the 45th day in UTC — see the 🛑 in the header for why the boundary
 * is a day and not an instant.
 */
export function preOrderDeliveryWindowEnd(now: Date = new Date()): Date {
  const end = new Date(now.getTime() + PREORDER_MAX_DELIVERY_DAYS * DAY_MS);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

/**
 * The same boundary as a `YYYY-MM-DD` string, for an `<input type="date" max>`.
 *
 * 🛑 Derived from `preOrderDeliveryWindowEnd`, never formatted independently.
 * A `max` attribute computed one way and a server refusal computed another is
 * a control that offers a value the save then rejects, which reads as a broken
 * form rather than as a rule.
 */
export function preOrderDeliveryMaxInputValue(now: Date = new Date()): string {
  return preOrderDeliveryWindowEnd(now).toISOString().slice(0, 10);
}

/**
 * Anything a delivery date can be by the time it reaches a check: an ISO
 * string from a request body, a `Date` from Firestore through `mapDoc`, a
 * Firestore `Timestamp` on a raw read, or absent.
 *
 * `Timestamp` cannot be imported here — this module is client-safe and
 * firebase-admin is not — hence the structural `{ toDate() }` arm, the same
 * shape `_internal/shared/listing-types/availability.ts` uses.
 */
export type PreOrderDeliveryDateLike =
  | string
  | number
  | Date
  | { toDate: () => Date }
  | null
  | undefined;

function coerce(value: PreOrderDeliveryDateLike): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "object" && typeof value.toDate === "function") {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * The one comparison.
 *
 * `now` is a parameter rather than a `new Date()` inside, so the negative
 * control can pin it and a test for "day 46 is refused" cannot pass by
 * accident on a machine whose clock is a few hours off a boundary.
 */
export function checkPreOrderDeliveryDate(
  value: PreOrderDeliveryDateLike,
  now: Date = new Date(),
): PreOrderDeliveryVerdict {
  if (value === null || value === undefined || value === "") return "absent";
  const date = coerce(value);
  if (!date) return "unparseable";
  if (date.getTime() <= now.getTime()) return "past";
  if (date.getTime() > preOrderDeliveryWindowEnd(now).getTime()) return "beyond-window";
  return "ok";
}

/*
 * 🛑 There is deliberately no `isWritablePreOrderDeliveryDate(value): boolean`
 * convenience wrapper. One was written and deleted: a boolean cannot carry
 * WHICH of the four verdicts applied, so the two write schemas would have had
 * to call `checkPreOrderDeliveryDate` anyway to pick a message — and an
 * exported helper with no caller is the speculative-infra pattern. Call sites
 * compare the verdict; the two they accept (`ok`, `absent`) are three
 * characters longer and say what they mean.
 */

/*
 * ── Messages ────────────────────────────────────────────────────────────────
 *
 * 🛑 These name the LIMIT and its CONSEQUENCE, in that order, because the
 * consequence is the part a seller will otherwise discover as a cancelled
 * order three weeks later. They interpolate the constant rather than quoting
 * "45", so a gateway change updates the message instead of contradicting it.
 */

export const PREORDER_DELIVERY_BEYOND_WINDOW_MESSAGE =
  `A pre-order must promise delivery within ${PREORDER_MAX_DELIVERY_DAYS} days of purchase. ` +
  `Pick a date no more than ${PREORDER_MAX_DELIVERY_DAYS} days away, or list this as an ordinary ` +
  `product once you can ship it — a pre-order that overruns the window is cancelled and refunded ` +
  `automatically.`;

export const PREORDER_DELIVERY_PAST_MESSAGE =
  "The estimated delivery date has already passed. Set a future date you can meet — " +
  "a pre-order is cancelled and refunded automatically once its promised date goes by.";

export const PREORDER_DELIVERY_UNPARSEABLE_MESSAGE =
  "Enter the estimated delivery date as a real calendar date.";

export const PREORDER_DELIVERY_REQUIRED_MESSAGE =
  "An estimated delivery date is required for a pre-order.";

/*
 * ── Buyer-facing messages ───────────────────────────────────────────────────
 *
 * 🛑 SEPARATE from the seller's, deliberately. The seller's message tells them
 * which fix to apply ("pick a date no more than 45 days away"), and a buyer
 * refused at checkout can do none of those things — handing them the seller's
 * instructions reads as the site blaming them for someone else's listing.
 * These say what happened and what they can do: wait, or ask the seller.
 */

export const PREORDER_BUYER_DELIVERY_PAST_MESSAGE =
  "Its promised delivery date has already passed, so it is no longer taking pre-orders. " +
  "The seller needs to set a new date before it can be bought.";

export const PREORDER_BUYER_DELIVERY_BEYOND_WINDOW_MESSAGE =
  `Its promised delivery date is more than ${PREORDER_MAX_DELIVERY_DAYS} days away, which we cannot ` +
  `accept payment for — a pre-order has to be deliverable within ${PREORDER_MAX_DELIVERY_DAYS} days. ` +
  `The seller needs to bring the date forward before it can be bought.`;

/** The buyer-facing message for a verdict, or `null` when it is acceptable. */
export function preOrderDeliveryBuyerMessage(
  verdict: PreOrderDeliveryVerdict,
): string | null {
  switch (verdict) {
    case "past":
      return PREORDER_BUYER_DELIVERY_PAST_MESSAGE;
    case "beyond-window":
      return PREORDER_BUYER_DELIVERY_BEYOND_WINDOW_MESSAGE;
    /*
     * A buyer is never shown anything for these three. `ok` is fine; `absent`
     * and `unparseable` are deliberately NOT refused at checkout (see the
     * comment in `preorder.rule.ts`), so a message for them would be a
     * sentence with no surface to appear on.
     */
    case "ok":
    case "absent":
    case "unparseable":
      return null;
  }
}

/** The seller-facing message for a verdict, or `null` when it is acceptable. */
export function preOrderDeliveryMessage(
  verdict: PreOrderDeliveryVerdict,
): string | null {
  switch (verdict) {
    case "ok":
      return null;
    case "absent":
      return PREORDER_DELIVERY_REQUIRED_MESSAGE;
    case "unparseable":
      return PREORDER_DELIVERY_UNPARSEABLE_MESSAGE;
    case "past":
      return PREORDER_DELIVERY_PAST_MESSAGE;
    case "beyond-window":
      return PREORDER_DELIVERY_BEYOND_WINDOW_MESSAGE;
  }
}
