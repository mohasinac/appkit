/**
 * Stickers listing rule — printed-only sticker sheets/packs, standard-like checkout.
 *
 * No bespoke checkout behavior: cart/order grouping, stock decrement, and
 * refund policy all follow the standard defaults. The listing type only
 * changes presentation (PDP badges, seller form fields) via `pluginFor()`.
 */
import type { ListingCheckoutRule } from "./types";
import { DEFAULT_LISTING_RULE } from "./_defaults";

export const stickersRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "standard",
};
