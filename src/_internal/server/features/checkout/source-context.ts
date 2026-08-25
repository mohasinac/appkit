/*
 * WHY: An order records WHAT was bought and WHAT it cost, and nothing about how
 *      the buyer earned the right to buy it at that price. `orderType` has five
 *      values and cannot even separate "won at ₹4,200 against 11 bids" from
 *      "bought out at ₹6,000 while the standing bid was ₹3,800" — both land as
 *      `orderType: "auction"`. Everything else was recoverable only by reading
 *      the auction or offer document, which is mutable and eventually archived.
 * WHAT: `buildOrderSourceContext()` — the ONE builder for `OrderSourceContext`,
 *       called by both order-creation paths (manual/COD and Razorpay).
 *
 * ## Why one shared function and not two inline blocks
 *
 * `createOrderForGroup` and `createRazorpayGroupOrder` are near-identical
 * ~200-line twins that already drifted once on add-on fees (Root Cause #65).
 * Two hand-written copies of this would be the create-vs-create axis of Root
 * Cause #39: one lane records provenance, the other silently doesn't, and the
 * difference is invisible until someone compares two orders months later.
 *
 * ## Written once, never recomputed
 *
 * These numbers describe a moment. `product.price` moves, `currentBid` is a
 * mirror that a pending buyout deliberately never writes to, and a settled
 * auction is eventually archived. Recomputing later would silently rewrite
 * history, so nothing outside order creation may write this field.
 *
 * ## Read cost
 *
 * Standard, pre-order and prize-draw cost **zero** extra reads — everything
 * comes from the product already in hand. Only the auction and offer lanes pay:
 * one `findByProductSorted` for auctions (bid count, winner, runner-up, the
 * standing bid — all four from one query) and one `findById` for offers. Since
 * a checkout is single-lane by construction, a standard cart never pays either.
 *
 * ## Failure is non-fatal, deliberately
 *
 * A missing bid or offer document returns `undefined` rather than throwing. The
 * money path must not fail because a provenance record could not be assembled —
 * an order with no `sourceContext` is a thinner record; a checkout that 500s
 * after payment authorisation is a support ticket.
 *
 * EXPORTS:
 *   buildOrderSourceContext
 *
 * @tag domain:checkout,orders
 * @tag layer:server-feature
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:checkout/actions.ts
 * @tag sideEffects:firestore-read
 */

import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import type { OrderSourceContext } from "../../../../features/orders/schemas/firestore";
import type { OrderType } from "../../../../features/orders/utils/order-splitter";
import { bidRepository } from "../../../../features/auctions/repository/bid.repository";
import { offerRepository } from "../../../../features/seller/repository/offer.repository";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";

/** Bids that count toward "against N bidders" — a buyout is excluded. */
function competitiveBids(bids: { id: string; isBuyout?: boolean; bidAmount: number }[]) {
  return bids.filter((b) => !b.isBuyout).sort((a, b) => b.bidAmount - a.bidAmount);
}

export async function buildOrderSourceContext(
  item: CartItemDocument,
  product: ProductDocument,
  orderType: OrderType,
): Promise<OrderSourceContext | undefined> {
  try {
    // The offer lane is checked BEFORE orderType, because an accepted offer on
    // a standard listing arrives as orderType "offer" but an accepted offer on
    // a classified does not — the cart line's own `offerId` is the reliable
    // discriminator, exactly as `laneOf()` treats it.
    if (item.offerId) {
      const offer = await offerRepository.findById(item.offerId);
      if (!offer) return undefined;
      return {
        path: "offer-accepted",
        offerId: offer.id,
        offeredAmount: offer.offerAmount,
        listPriceAtOffer: offer.listedPrice,
        counterAmount: offer.counterAmount,
        // Persisted since W2. Before the chain fields existed this number was
        // genuinely unknowable — each counter created an unlinked document.
        counterRounds: offer.counterRound ?? 1,
        acceptedBy: offer.storeId,
        acceptedAt: offer.acceptedAt ?? offer.respondedAt ?? new Date(),
        checkoutDeadline: offer.checkoutDeadline,
      };
    }

    if (item.bidId) {
      const bids = await bidRepository.findByProductSorted(item.productId);
      const rivals = competitiveBids(bids);
      const auctionId = item.auctionId ?? item.productId;

      if (item.isBuyout) {
        return {
          path: "auction-buy-now",
          auctionId,
          bidId: item.bidId,
          buyNowPrice: item.lockedPrice ?? product.buyNowPrice ?? item.price,
          listPrice: product.price,
          // From the bids, not `product.currentBid` — a pending buyout never
          // writes that mirror, so reading it would understate the auction.
          standingBidAtBuyout: rivals[0]?.bidAmount ?? 0,
          bidCount: rivals.length,
          boughtAt: new Date(),
          checkoutDeadline: item.checkoutDeadline ?? new Date(),
          auctionEndDate: product.auctionEndDate,
        };
      }

      const winning = bids.find((b) => b.id === item.bidId);
      const winningAmount = winning?.bidAmount ?? item.lockedPrice ?? item.price;
      const reserve = product.reservePrice;
      return {
        path: "auction-won",
        auctionId,
        bidId: item.bidId,
        winningBidAmount: winningAmount,
        bidCount: rivals.length,
        startingBid: product.startingBid ?? 0,
        reservePrice: reserve,
        // No reserve set means the reserve cannot fail, so it is met.
        reserveMet: reserve == null ? true : winningAmount >= reserve,
        auctionEndedAt: product.auctionEndDate ?? new Date(),
        runnerUpAmount: rivals.find((b) => b.id !== item.bidId)?.bidAmount,
      };
    }

    if (orderType === "preorder") {
      const deposit =
        product.preOrderDepositAmount ??
        (product.preOrderDepositPercent != null
          ? (product.price * product.preOrderDepositPercent) / 100
          : 0);
      return {
        path: "pre-order",
        depositAmount: deposit,
        balanceDue: Math.max(0, product.price - deposit),
        expectedDeliveryDate: product.preOrderDeliveryDate,
      };
    }

    if (orderType === "prize-draw") {
      return {
        path: "prize-draw",
        prizeDrawProductId: item.productId,
        pricePerEntry: product.pricePerEntry ?? product.price,
        entryCount: item.quantity,
        // `prizeDrawMode` is reveal-vs-lottery, a different axis. The reveal
        // TIMING is what this records: a draw with a reveal window is
        // scheduled, one without reveals as soon as it sells out.
        revealMode: product.prizeRevealWindowEnd ? "scheduled" : "instant",
      };
    }

    return { path: "standard", listPrice: product.price };
  } catch (err) {
    const normalized = normalizeError(err);
    // Non-fatal by design — see the header. Logged loudly so a systematic
    // failure shows up as a pattern rather than as quietly thinner orders.
    serverLogger.warn("[checkout] could not build sourceContext", {
      productId: item.productId,
      orderType,
      error: normalized.message,
    });
    return undefined;
  }
}
