/*
 * WHY: A cart can hold three kinds of line with three different obligations — a
 *      won auction (you owe it), an accepted offer (you negotiated it, at a
 *      locked price, on a deadline), and ordinary shopping. Mixing them into one
 *      total lets a buyer settle a ₹200 sticker while a ₹30,000 auction win they
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
  AUCTION: "auction",
  OFFER: "offer",
  STANDARD: "standard",
} as const;

export type CartLane = (typeof CART_LANE)[keyof typeof CART_LANE];

/**
 * Highest obligation first. An auction win is a completed sale the buyer already
 * committed to by bidding; an accepted offer is a price the seller has held for
 * them on a clock; ordinary cart items carry no commitment at all.
 */
export const CART_LANE_PRIORITY: readonly CartLane[] = [
  CART_LANE.AUCTION,
  CART_LANE.OFFER,
  CART_LANE.STANDARD,
];

export const CART_LANE_LABELS: Record<CartLane, string> = {
  auction: "Auction wins",
  offer: "Accepted offers",
  standard: "Cart",
};

/**
 * How long a locked line survives before it lapses, per lane.
 *
 * Lives here, with the lane model, because the deadline is a property OF the
 * lane — and because `AUCTION_CHECKOUT_WINDOW_MS` was previously declared twice
 * (`auctionSettlement.ts` and `bid-actions.ts`, i.e. the settlement path and the
 * Buy-Now path) with no link between them: changing one would silently give the
 * same kind of win two different deadlines depending on how it was won.
 *
 * The two windows are equal today but mean different things, so they stay
 * separate names rather than one shared constant:
 *  - **auction** — payment is MANDATORY. You bid, you won, you owe it. Past the
 *    deadline the bid is forfeited and the buyer is warned that repeated
 *    non-payment restricts their account.
 *  - **offer** — payment is OPTIONAL. Declining to buy at your own offer price
 *    is the buyer's right; the offer simply lapses with no penalty.
 */
export const LANE_CHECKOUT_WINDOW_MS: Record<"auction" | "offer", number> = {
  /** 2 days. Mandatory — enforced by the expiry sweep, which forfeits the bid. */
  auction: 48 * 60 * 60 * 1000,
  /** 2 days. Optional — lapses quietly, no penalty. */
  offer: 48 * 60 * 60 * 1000,
};

/** 2 days, in hours — for buyer-facing copy ("pay within 48 hours"). */
export const LANE_CHECKOUT_WINDOW_HOURS: Record<"auction" | "offer", number> = {
  auction: LANE_CHECKOUT_WINDOW_MS.auction / (60 * 60 * 1000),
  offer: LANE_CHECKOUT_WINDOW_MS.offer / (60 * 60 * 1000),
};

/**
 * A BUYOUT hold is a third window, deliberately much shorter than the two above,
 * even though it lands in the same auction lane.
 *
 * A settled win (`LANE_CHECKOUT_WINDOW_MS.auction`) is a finished auction: the
 * clock already ran, nobody else is waiting, and 48 hours costs no one anything.
 * A buyout is the opposite — the auction is still live and still taking bids
 * while the hold exists, so a long window would let one buyer sit on a listing
 * they may never pay for. One hour, and the hold is additionally clamped to the
 * auction's own end time by `buyNowAuction` (see `AUCTION_BUYOUT_WINDOW_MS`
 * callers): a buyout that hasn't been paid for by the time the auction ends
 * fails, because by then the auction has settled to whoever actually won it.
 */
export const AUCTION_BUYOUT_WINDOW_MS = 60 * 60 * 1000;

/** 1 hour, in minutes — for buyer-facing copy ("pay within 60 minutes"). */
export const AUCTION_BUYOUT_WINDOW_MINUTES = AUCTION_BUYOUT_WINDOW_MS / (60 * 1000);

/**
 * Deep link that drops a buyer straight into the auction lane at checkout.
 *
 * Declared once here, with the lane it selects, because it was previously a
 * const in `auctionSettlement.ts` AND an inline template literal in
 * `bid-actions.ts` — the same two-copies problem `LANE_CHECKOUT_WINDOW_MS` was
 * extracted to fix, one layer up.
 */
export const AUCTION_CHECKOUT_URL = `${String(ROUTES.USER.CHECKOUT)}?lane=${CART_LANE.AUCTION}`;

/** The two lanes whose price is fixed outside the listing. */
export function isLockedLane(lane: CartLane): boolean {
  return lane === CART_LANE.AUCTION || lane === CART_LANE.OFFER;
}

/** Minimal shape this module needs — works on cart documents and client rows alike. */
export interface LaneAssignable {
  isAuctionWin?: boolean;
  isOffer?: boolean;
  offerId?: string;
  bidId?: string;
}

export function laneOf(item: LaneAssignable): CartLane {
  if (item.isAuctionWin || item.bidId) return CART_LANE.AUCTION;
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
  const counts: Record<CartLane, number> = { auction: 0, offer: 0, standard: 0 };
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

  if (active === CART_LANE.AUCTION) {
    const n = counts.auction;
    return `Settle your ${n} won auction${n === 1 ? "" : "s"} first — auction wins are already committed purchases.`;
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
