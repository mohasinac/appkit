/**
 * Art & Stickers listing rule — printed-only artwork, prints and sticker
 * sheets/packs; standard-like checkout.
 *
 * No bespoke checkout behavior: cart/order grouping, stock decrement, and
 * refund policy all follow the standard defaults. The listing type only
 * changes presentation (PDP badges, seller form fields) via `pluginFor()`.
 *
 * 🛑 This file is the merge of the former `art.rule.ts` and
 * `stickers.rule.ts`, which were byte-identical apart from their doc comment.
 */
import type { ListingCheckoutRule } from "./types";
import { DEFAULT_LISTING_RULE } from "./_defaults";

export const artAndStickersRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "standard",
};
