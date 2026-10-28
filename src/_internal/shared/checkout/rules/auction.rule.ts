import type { ListingCheckoutRule } from "./types";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import { DEFAULT_LISTING_RULE } from "./_defaults";

export const auctionRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "auction",
  cartEligible: false, // bid-only; add-to-cart is blocked at the action layer
  cartIneligibleHint: "Place a bid on the auction page instead.",
  /*
   * 🛑 THE GATEWAY IS PROHIBITED HERE, and this list was INVERTED until
   * 2026-10-28 — it blocked `cod` and `cash` while leaving `online` open, so
   * every auction win was payable by card.
   *
   * The reason is the acquirer's, not ours. Auction and bidding businesses sit
   * on the prohibited-merchant lists Indian PGs inherit from the card networks,
   * alongside lotteries and games of chance. Settling auction wins through a
   * standard e-commerce MID is a terms breach, and the penalty is not a
   * declined transaction — it is the whole merchant account frozen with the
   * settlement balance held. One category of order can cost every other
   * category its ability to take money at all.
   *
   * So: manual bank/UPI transfer, or cash on pickup. Both land in the owner's
   * own account with no acquirer in the path.
   *
   * 🛑 `cash` is now ALLOWED, reversing the rule below it. The old comment is
   * kept because its reasoning is still sound — a pay-later method on a unique
   * lot has no second-highest bidder to fall back on — but it was weighing
   * seller risk against buyer convenience, and that trade is not what decides
   * this. The storefront is single-vendor and the owner is the seller: they
   * accept the non-payment risk on their own lots, and they do not get to
   * accept the risk of losing the merchant account. `emi` goes for the same
   * reason as `online` — it settles through the same acquirer.
   */
  blockedPaymentMethods: ["online", "cod", "emi"],
  blockedPaymentMessage:
    "An auction win is settled by direct bank/UPI transfer or cash on pickup — card and online payment are not available for auctions.",
  canMergeWithSameProduct: false,
  refundPolicy: { full: true, partial: false, partialGranularity: "none" },
  splitKey: (item: CartItemDocument) => `auction:${item.itemId}`,
};
