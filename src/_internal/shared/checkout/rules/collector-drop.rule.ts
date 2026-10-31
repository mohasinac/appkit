import type { ListingCheckoutRule } from "./types";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import { DEFAULT_LISTING_RULE } from "./_defaults";

export const collectorDropRule: ListingCheckoutRule = {
  ...DEFAULT_LISTING_RULE,
  orderType: "collector-drop",
  cartEligible: false, // bid-only; add-to-cart is blocked at the action layer
  cartIneligibleHint: "Place a bid on the collector drop page instead.",
  /*
   * 🛑 THE GATEWAY IS PROHIBITED HERE, and this list was INVERTED until
   * 2026-10-28 — it blocked `cod` and `cash` while leaving `online` open, so
   * every collector drop win was payable by card.
   *
   * The reason is the acquirer's, not ours. Collector Drop and bidding businesses sit
   * on the prohibited-merchant lists Indian PGs inherit from the card networks,
   * alongside lotteries and games of chance. Settling collector drop wins through a
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
   *
   * 🛑 `online` MOVED OUT of this list on 2026-10-31, to
   * `requiresGatewayPermission` below. Everything above is still true of
   * Razorpay and PhonePe and is kept for that reason — but it was never true
   * of every acquirer, only of the ones whose terms name bidding. Cashfree's
   * published terms do not, so "online is prohibited here" was being stated
   * as a property of the LISTING when it is a property of WHO IS COLLECTING.
   *
   * `cod` and `emi` stay, and the distinction is the point: those are about
   * the unique lot (no second-highest bidder behind a pay-later default, and
   * EMI settles through an acquirer anyway), so they hold whatever gateway is
   * registered.
   */
  blockedPaymentMethods: ["cod", "emi"],
  requiresGatewayPermission: true,
  blockedPaymentMessage:
    "A collector drop win is settled by direct bank/UPI transfer or cash on pickup — pay-later methods are not available for collector drops.",
  canMergeWithSameProduct: false,
  refundPolicy: { full: true, partial: false, partialGranularity: "none" },
  splitKey: (item: CartItemDocument) => `collectorDrop:${item.itemId}`,
};
