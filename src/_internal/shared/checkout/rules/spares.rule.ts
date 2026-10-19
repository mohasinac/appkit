/**
 * Spares listing rule — one component off a disassembled item, standard-like
 * checkout.
 *
 * No bespoke behaviour: cart/order grouping, stock decrement and refund policy
 * all follow the standard defaults, and `pluginFor()` carries everything that
 * differs (badge, browse route, seller form fields).
 *
 * 🛑 `orderType: "standard"` is deliberate rather than lazy. A new `OrderType`
 * member fans out into the order-status tabs, the order filters and the
 * splitter's own keys — and buys nothing here, because a spare is fulfilled,
 * refunded and reported exactly like any other physical item. A buyer looking
 * at their orders wants "the attack ring I bought", not a separate tab for it.
 */
import type { ListingCheckoutRule } from "./types";
import { DEFAULT_LISTING_RULE } from "./_defaults";

export const sparesRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "standard",
};
