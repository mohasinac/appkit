/**
 * order-completion — server surface.
 *
 * The buyer's side of the owner's 2026-10-21 rule: per-item ratings
 * (Zomato-style) and the fast completion path they unlock.
 */

export {
  getRateableItemsAction,
  rateOrderItemAction,
  markOrderCompleteAction,
  type RateableOrderItem,
  type RateOrderItemInput,
} from "./actions";
