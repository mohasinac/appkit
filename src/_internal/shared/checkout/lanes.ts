/*
 * WHY: A cart can hold three kinds of line with three different obligations — a
 *      won collector drop (you owe it), an accepted offer (you negotiated it, at a
 *      locked price, on a deadline), and ordinary shopping. Mixing them into one
 *      total lets a buyer settle a ₹200 sticker while a ₹30,000 collector drop win they
 *      already committed to sits unpaid, and makes every total ambiguous.
 * WHAT: The lane model — a derived (never stored) partition of the cart, with a
 *       strict priority order. Exactly one lane is checkout-able at a time: the
 *       highest-priority non-empty one. Lower lanes stay visible but disabled,
 *       and while a higher lane is pending nothing new may be added to the cart.
 *
 * Derived on purpose. A stored `lane` mirror field would drift the first time a
 * write path forgot it (CLAUDE.md Root Cause #42), exactly as the manual-payment
 * queue state is derived rather than stored.
 *
 * EXPORTS:
 *   CartLane, CART_LANE_PRIORITY, CART_LANE_LABELS, laneOf, activeLane,
 *   laneItems, laneCounts, isLaneCheckoutable, laneBlockReason, isLockedLane
 *
 * @tag domain:checkout,cart
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:CartRouteClient,CheckoutRouteClient,cart-actions,order-splitter,checkout/actions
 * @tag sideEffects:none
 */

import { ROUTES } from "../../../next/routing/route-map";

export const CART_LANE = {
  COLLECTOR_DROP: "collector-drop",
  OFFER: "offer",
  STANDARD: "standard",
} as const;

export type CartLane = (typeof CART_LANE)[keyof typeof CART_LANE];

/**
 * Highest obligation first. A collector drop win is a completed sale the buyer already
 * committed to by bidding; an accepted offer is a price the seller has held for
 * them on a clock; ordinary cart items carry no commitment at all.
 */
export const CART_LANE_PRIORITY: readonly CartLane[] = [
  CART_LANE.COLLECTOR_DROP,
  CART_LANE.OFFER,
  CART_LANE.STANDARD,
];

export const CART_LANE_LABELS: Record<CartLane, string> = {
  "collector-drop": "Collector Drop wins",
  offer: "Accepted offers",
  standard: "Cart",
};

/**
 * How long a locked line survives before it lapses, per lane.
 *
 * Lives here, with the lane model, because the deadline is a property OF the
 * lane — and because `COLLECTOR_DROP_CHECKOUT_WINDOW_MS` was previously declared twice
 * (`collectorDropSettlement.ts` and `bid-actions.ts`, i.e. the settlement path and the
 * Buy-Now path) with no link between them: changing one would silently give the
 * same kind of win two different deadlines depending on how it was won.
 *
 * The two windows are equal today but mean different things, so they stay
 * separate names rather than one shared constant:
 *  - **collector-drop** — payment is MANDATORY. You bid, you won, you owe it. Past the
 *    deadline the bid is forfeited and the buyer is warned that repeated
 *    non-payment restricts their account.
 *  - **offer** — payment is OPTIONAL. Declining to buy at your own offer price
 *    is the buyer's right; the offer simply lapses with no penalty.
 */
export const LANE_CHECKOUT_WINDOW_MS: Record<"collector-drop" | "offer", number> = {
  /** 2 days. Mandatory — enforced by the expiry sweep, which forfeits the bid. */
  "collector-drop": 48 * 60 * 60 * 1000,
  /** 2 days. Optional — lapses quietly, no penalty. */
  offer: 48 * 60 * 60 * 1000,
};

/** 2 days, in hours — for buyer-facing copy ("pay within 48 hours"). */
export const LANE_CHECKOUT_WINDOW_HOURS: Record<"collector-drop" | "offer", number> = {
  "collector-drop": LANE_CHECKOUT_WINDOW_MS["collector-drop"] / (60 * 60 * 1000),
  offer: LANE_CHECKOUT_WINDOW_MS.offer / (60 * 60 * 1000),
};

/**
 * A BUYOUT hold is a third window, deliberately much shorter than the two above,
 * even though it lands in the same collector drop lane.
 *
 * A settled win (`LANE_CHECKOUT_WINDOW_MS["collector-drop"]`) is a finished collector drop: the
 * clock already ran, nobody else is waiting, and 48 hours costs no one anything.
 * A buyout is the opposite — the collector drop is still live and still taking bids
 * while the hold exists, so a long window would let one buyer sit on a listing
 * they may never pay for. One hour, and the hold is additionally clamped to the
 * collector drop's own end time by `buyNowCollectorDrop` (see `COLLECTOR_DROP_BUYOUT_WINDOW_MS`
 * callers): a buyout that hasn't been paid for by the time the collector drop ends
 * fails, because by then the collector drop has settled to whoever actually won it.
 */
export const COLLECTOR_DROP_BUYOUT_WINDOW_MS = 60 * 60 * 1000;

/** 1 hour, in minutes — for buyer-facing copy ("pay within 60 minutes"). */
export const COLLECTOR_DROP_BUYOUT_WINDOW_MINUTES = COLLECTOR_DROP_BUYOUT_WINDOW_MS / (60 * 1000);

/**
 * Deep link that drops a buyer straight into the collector drop lane at checkout.
 *
 * Declared once here, with the lane it selects, because it was previously a
 * const in `collectorDropSettlement.ts` AND an inline template literal in
 * `bid-actions.ts` — the same two-copies problem `LANE_CHECKOUT_WINDOW_MS` was
 * extracted to fix, one layer up.
 */
export const COLLECTOR_DROP_CHECKOUT_URL = `${String(ROUTES.USER.CHECKOUT)}?lane=${CART_LANE.COLLECTOR_DROP}`;

/** The two lanes whose price is fixed outside the listing. */
export function isLockedLane(lane: CartLane): boolean {
  return lane === CART_LANE.COLLECTOR_DROP || lane === CART_LANE.OFFER;
}

/** Minimal shape this module needs — works on cart documents and client rows alike. */
export interface LaneAssignable {
  isCollectorDropWin?: boolean;
  isOffer?: boolean;
  offerId?: string;
  bidId?: string;
}

export function laneOf(item: LaneAssignable): CartLane {
  if (item.isCollectorDropWin || item.bidId) return CART_LANE.COLLECTOR_DROP;
  if (item.isOffer || item.offerId) return CART_LANE.OFFER;
  return CART_LANE.STANDARD;
}

export function laneItems<T extends LaneAssignable>(
  items: readonly T[],
  lane: CartLane,
): T[] {
  return items.filter((i) => laneOf(i) === lane);
}

export function laneCounts(items: readonly LaneAssignable[]): Record<CartLane, number> {
  const counts: Record<CartLane, number> = { "collector-drop": 0, offer: 0, standard: 0 };
  for (const item of items) counts[laneOf(item)] += 1;
  return counts;
}

/**
 * The one lane the buyer may check out right now, or null for an empty cart.
 */
export function activeLane(items: readonly LaneAssignable[]): CartLane | null {
  const counts = laneCounts(items);
  return CART_LANE_PRIORITY.find((lane) => counts[lane] > 0) ?? null;
}

export function isLaneCheckoutable(
  items: readonly LaneAssignable[],
  lane: CartLane,
): boolean {
  return activeLane(items) === lane;
}

/**
 * The items a checkout settles when the buyer has made no explicit selection.
 *
 * 🛑 This MUST be the active lane, never the whole cart. Both placement paths
 * used to fall back to `cart.items`, and `assertCheckoutLane` then compared the
 * whole cart against its own active lane — so every off-lane line was a
 * violation and the throw was unconditional. The consequence was total: a cart
 * holding more than ONE lane could not be checked out by any UI path, with
 * `CHECKOUT_LANE_BLOCKED` and "Settle your 1 won collector drop first" returned for
 * the very lane the buyer was already settling.
 *
 * Multi-lane carts are not an edge case — they are what the lane model
 * produces. `collectorDropSettlement` pushes a won collector drop straight into the cart
 * whatever is already sitting in it, and `assertCanAddNewItems` only blocks
 * ADDING while a higher lane is pending; it never clears what was there first.
 * So any buyer who had anything in their cart when they won a collector drop was
 * locked out of checkout entirely. That is Root Cause #60's symptom returning
 * by a different mechanism — the collector drop winner who cannot pay.
 *
 * Returning the active lane also makes the server agree with what the buyer is
 * looking at: the cart page scopes its lines, its totals and its CTA to that
 * same lane, and renders no selection control at all, so "no explicit
 * selection" means "the lane on screen" and can mean nothing else.
 */
export function defaultCheckoutItems<T extends LaneAssignable>(
  items: readonly T[],
): T[] {
  const active = activeLane(items);
  return active ? laneItems(items, active) : [...items];
}

/**
 * THE item set a checkout charges for and settles. One definition, both paths.
 *
 * ## 🛑 D40: the captured item set was not the settled item set, in TWO ways
 *
 * Measured, because the plan recorded only the first half:
 *
 * | | capture (`/api/payment/create-order`) | settle (gateway path) |
 * |---|---|---|
 * | with a selection | the selected items, **any lane** | **the active lane**, selection IGNORED |
 * | with no selection | **the whole cart, every lane** | the active lane only |
 *
 * The first row is the one the plan describes: deselect half the cart, pay for
 * half, receive orders for the whole lane — the buyer gets goods they did not
 * pay for and the seller's stock leaves without payment.
 *
 * 🛑 **The second row is worse and was not recorded anywhere: the buyer is
 * OVERCHARGED.** With no explicit selection the capture route billed
 * `cart.items` — every lane — while settle created orders for the active lane
 * only. And multi-lane carts are not an edge case: `defaultCheckoutItems`' own
 * docstring above says they "are what the lane model produces", because
 * `collectorDropSettlement` pushes a won collector drop into whatever is already in the
 * cart. So a buyer with a won collector drop and ordinary items in the cart was
 * charged for both and received orders for one.
 *
 * ## The rule
 *
 * **Active lane first, then the selection as a filter within it.** Not the
 * other way round, and not selection-instead-of-lane:
 *
 * - The lane invariant is non-negotiable — `assertCheckoutLane` refuses any
 *   settle whose items are not the active lane, so a selection spanning lanes
 *   could be charged and then never settled. That is the D64 class (money
 *   taken, no order).
 * - An empty intersection is a REFUSAL, not a silent widening. A selection
 *   naming only off-lane items means the buyer is looking at something the
 *   server will not sell them, and falling back to the whole lane would charge
 *   them for items they deliberately unticked.
 */
export function resolveCheckoutItems<T extends LaneAssignable & { itemId: string }>(
  items: readonly T[],
  selectedItemIds?: readonly string[] | null,
): T[] {
  const inLane = defaultCheckoutItems(items);
  if (!selectedItemIds?.length) return inLane;
  const selected = new Set(selectedItemIds);
  return inLane.filter((item) => selected.has(item.itemId));
}

/**
 * Why `lane` can't be checked out right now — null when it can.
 * Phrased for the buyer, naming the lane that's blocking and what to do.
 */
export function laneBlockReason(
  items: readonly LaneAssignable[],
  lane: CartLane,
): string | null {
  const active = activeLane(items);
  if (active === lane) return null;

  const counts = laneCounts(items);
  if (counts[lane] === 0) return "There's nothing in this tab yet.";

  if (active === CART_LANE.COLLECTOR_DROP) {
    const n = counts["collector-drop"];
    return `Settle your ${n} won collector drop${n === 1 ? "" : "s"} first — collector drop wins are already committed purchases.`;
  }
  if (active === CART_LANE.OFFER) {
    const n = counts.offer;
    return `Complete your ${n} accepted offer${n === 1 ? "" : "s"} first — the agreed price is only held for a limited time.`;
  }
  return "This tab can't be checked out right now.";
}

/**
 * Whether a NEW item may be added to the cart at all. While a higher-obligation
 * lane is pending, adding more shopping would let the buyer keep deferring the
 * thing they already committed to.
 */
export function canAddNewItems(items: readonly LaneAssignable[]): boolean {
  const active = activeLane(items);
  return active === null || active === CART_LANE.STANDARD;
}
