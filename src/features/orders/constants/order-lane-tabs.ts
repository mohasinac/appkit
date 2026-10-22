/**
 * Order PROVENANCE tabs — the one definition, shared by the buyer's and the
 * seller's order lists.
 *
 * ## Why this file exists
 *
 * The buyer's list had these tabs and the seller's did not. A seller could see
 * every order and could not ask "show me the ones I accepted an offer on" or
 * "show me the auction wins", which is exactly the split that changes how they
 * are handled: an auction win has a forfeit deadline, an accepted offer has an
 * agreed price that is not the listing price.
 *
 * Copying the array into the second view would have been the ninth
 * hand-written enumeration of one union in this codebase (Root Cause #61), so
 * the labels are a `Record<OrderType, string>` instead: a sixth lane is a
 * COMPILE error here rather than a tab that silently never appears.
 *
 * 🛑 Three things about these ids, each of which has already cost a bug:
 *
 * 1. **Every id is EXACTLY a stored `OrderDocument.orderType` value.** Firestore
 *    `==` is byte-exact, so a tab id that is merely plausible returns zero rows
 *    forever with no error anywhere (Root Cause #33).
 *
 * 2. **`preorder` has NO HYPHEN and that is not a typo to tidy up.** `OrderType`
 *    spells it `preorder`; `ListingType` spells the same concept `pre-order`.
 *    Two unions, two spellings, and the tab must match the one actually stored.
 *
 * 3. **`standard` must be filtered IN MEMORY, never as a Firestore `==`.**
 *    Orders written before `orderType` existed carry no such field, and an
 *    equality excludes every document that lacks it — so the "Normal" tab would
 *    hide every legacy order while looking like it worked. `mergeOrderScopeFilter`
 *    and the server-side list both already honour this; see `ORDER_LANE_ALL` for
 *    the "no filter" sentinel.
 */

import type { OrderType } from "../utils/order-splitter";

/**
 * The "All" tab's id. An empty string rather than a word, so it can never
 * collide with a real `orderType` value and so `state.orderType ? … : null`
 * reads as "no filter" at every call site.
 */
export const ORDER_LANE_ALL = "" as const;

/**
 * 🛑 A `Record<OrderType, string>`, deliberately. Omitting a lane does not
 * compile, which is the whole point — the buyer's list shipped with four tabs
 * for five lanes, so pre-order and prize-draw orders were reachable only by
 * landing on "All" and scrolling.
 */
export const ORDER_LANE_LABELS: Record<OrderType, string> = {
  standard: "Normal",
  auction: "Auction wins",
  offer: "Offer wins",
  preorder: "Pre-orders",
  "prize-draw": "Prize draws",
};

/**
 * Display order, listed explicitly rather than taken from `Object.keys`.
 *
 * Key order on an object literal is not a contract anyone should rely on for
 * UI ordering, and the intended order is not alphabetical: it mirrors the
 * cart's lane PRIORITY (auction > offer > standard — highest obligation
 * first), with the two schedule-driven lanes after them.
 */
const LANE_ORDER: readonly OrderType[] = [
  "standard",
  "auction",
  "offer",
  "preorder",
  "prize-draw",
];

/**
 * The stored `orderType` values a lane filter may name, for route-side
 * validation.
 *
 * Derived from `ORDER_LANE_LABELS`, so it cannot drift from the tabs. Both
 * `/api/user/orders` and `/api/store/orders` had — or would have needed — their
 * own hand-written copy of these five strings; this is the eleventh
 * enumeration of one union in this codebase collapsed into the union itself
 * (Root Cause #61).
 *
 * 🛑 Validating against it is load-bearing, not hygiene: an unrecognised value
 * interpolated into a Sieve filter string is a caller-controlled field name
 * reaching the query builder.
 */
export const VALID_ORDER_TYPES: ReadonlySet<string> = new Set(
  Object.keys(ORDER_LANE_LABELS),
);

export interface OrderLaneTab {
  id: string;
  label: string;
}

/** `All` first, then every lane in `LANE_ORDER`. */
export const ORDER_LANE_TABS: readonly OrderLaneTab[] = [
  { id: ORDER_LANE_ALL, label: "All" },
  ...LANE_ORDER.map((type) => ({ id: type, label: ORDER_LANE_LABELS[type] })),
];
