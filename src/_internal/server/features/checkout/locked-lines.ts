/*
 * WHY: A "locked line" is a cart line whose price was fixed outside the listing —
 *      an accepted offer or a won auction. Two things were missing before
 *      2026-08-21: the offer/bid was never re-checked at ORDER time (only at
 *      add-to-cart time, so a line could sit in the cart past its deadline and
 *      still check out), and nothing ever closed the loop afterwards — the
 *      offer stayed "accepted" forever and could be re-added and re-ordered,
 *      and a won bid had no link to the order it became.
 * WHAT: `assertLockedLinesStillValid` (pre-order-creation guard) and
 *       `finalizeLockedLines` (post-order-creation close-out). Both are called
 *       from every order-creation path so the manual/COD and Razorpay flows
 *       cannot diverge.
 *
 * EXPORTS:
 *   assertLockedLinesStillValid, finalizeLockedLines
 *
 * @tag domain:checkout,offers,auctions
 * @tag layer:server-action
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:checkout/actions.ts
 * @tag sideEffects:firestore-write
 */

import { offerRepository } from "../../../../features/seller/repository/offer.repository";
import { bidRepository } from "../../../../repositories";
import { OfferStatusValues } from "../../../../features/seller/schemas";
import { BID_COLLECTION } from "../../../../features/auctions/schemas/firestore";
import { PRODUCT_COLLECTION } from "../../../../features/products/schemas/firestore";
import { ValidationError } from "../../../../errors";
import { BID_ERROR_CODES } from "../../../../errors/error-codes";
import { ERROR_MESSAGES } from "../../../../errors";
import { getAdminDb } from "../../../../providers/db-firebase";
import { serverLogger } from "../../../../monitoring/server-logger";
import { normalizeError } from "../../../../errors/normalize";
import { resolveDate } from "../../../../utils/date.formatter";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import type { BidDocument } from "../../../../features/auctions/schemas/firestore";
import { activeLane, laneOf, laneBlockReason } from "../../../shared/checkout/lanes";

/**
 * Refuse a checkout that isn't the cart's active lane.
 *
 * The client scopes its selection to one lane's tab, but a selection is just a
 * list of item ids in a request body — nothing stopped a caller from checking
 * out their ₹200 standard items while a ₹30,000 auction win they already
 * committed to sat unpaid. Priority is enforced here, on the server, over the
 * WHOLE cart, not over the caller-supplied subset.
 */
export function assertCheckoutLane(
  allCartItems: readonly CartItemDocument[],
  selectedItems: readonly CartItemDocument[],
): void {
  const active = activeLane(allCartItems);
  if (!active) return;

  const offLane = selectedItems.filter((item) => laneOf(item) !== active);
  if (offLane.length === 0) return;

  throw new ValidationError(
    laneBlockReason(allCartItems, laneOf(offLane[0])) ??
      "Please complete your outstanding items first.",
    { code: CHECKOUT_LANE_BLOCKED },
  );
}

/** Error code the client maps to a lane-aware message. */
export const CHECKOUT_LANE_BLOCKED = "CHECKOUT_LANE_BLOCKED";

/** Why a buyout claim could not be converted into a sale. */
type ClaimFailure =
  | "NOT_FOUND"
  | "ALREADY_SOLD"
  | "AUCTION_ENDED"
  | "LAPSED"
  | "OUTBID"
  | "WRONG_BUYER";

const CLAIM_FAILURE_ERRORS: Record<
  ClaimFailure,
  { message: string; code: string }
> = {
  NOT_FOUND: {
    message: ERROR_MESSAGES.BID.AUCTION_NOT_FOUND,
    code: BID_ERROR_CODES.PRODUCT_NOT_FOUND,
  },
  ALREADY_SOLD: {
    message: ERROR_MESSAGES.BID.AUCTION_ALREADY_SOLD,
    code: BID_ERROR_CODES.AUCTION_ALREADY_SOLD,
  },
  AUCTION_ENDED: {
    message: ERROR_MESSAGES.BID.AUCTION_ENDED_BEFORE_CHECKOUT,
    code: BID_ERROR_CODES.AUCTION_ENDED_BEFORE_CHECKOUT,
  },
  LAPSED: {
    message: ERROR_MESSAGES.BID.BUYOUT_LAPSED,
    code: BID_ERROR_CODES.BUYOUT_LAPSED,
  },
  OUTBID: {
    message: ERROR_MESSAGES.BID.BUYOUT_OUTBID,
    code: BID_ERROR_CODES.BUYOUT_OUTBID,
  },
  WRONG_BUYER: {
    message: ERROR_MESSAGES.BID.BUYOUT_LAPSED,
    code: BID_ERROR_CODES.BUYOUT_LAPSED,
  },
};

/**
 * Convert a pending Buy Now claim into an actual sale, atomically.
 *
 * This is where a buyout is decided, and it is the ONLY place the auction is
 * closed. `buyNowAuction` deliberately leaves the listing untouched: the auction
 * keeps running, keeps taking bids, and keeps accepting other buyers' buyouts.
 * That means several people can be holding a claim on the same auction at once,
 * which is intentional — whoever reaches this transaction first gets the item,
 * and everyone else is refused HERE, before their order is written and before
 * any payment is captured.
 *
 * Four ways to lose, all of them checked inside the transaction against freshly
 * read documents rather than against the caller's stale cart line:
 *  - the auction is already sold (another buyout committed first);
 *  - its clock ran out (settlement will award it to a real bidder — the user's
 *    explicit rule: an unfinished buyout at auction end fails);
 *  - the claim's own bid is no longer `active` (the deadline sweep cancelled it);
 *  - bidding passed the buyout price, so buying out is no longer the better deal.
 *
 * Returns a discriminated result rather than throwing out of the transaction
 * body, so each of these precise, buyer-readable refusals survives as itself
 * instead of being reshaped by the transaction wrapper. The caller throws.
 */
export async function claimAuctionForCheckout(
  item: CartItemDocument,
  buyerUid: string,
): Promise<{ ok: true; bidAmount: number } | { ok: false; reason: ClaimFailure }> {
  const productId = item.auctionId ?? item.productId;
  const bidId = item.bidId;
  if (!bidId) return { ok: false, reason: "NOT_FOUND" };

  const db = getAdminDb();
  return db.runTransaction(async (tx) => {
    const productRef = db.collection(PRODUCT_COLLECTION).doc(productId);
    const bidRef = db.collection(BID_COLLECTION).doc(bidId);

    const [productSnap, bidSnap] = await tx.getAll(productRef, bidRef);
    if (!productSnap.exists || !bidSnap.exists) {
      return { ok: false as const, reason: "NOT_FOUND" as const };
    }

    const product = productSnap.data() as Record<string, unknown>;
    const bid = bidSnap.data() as unknown as BidDocument;

    if (bid.userId !== buyerUid) return { ok: false as const, reason: "WRONG_BUYER" as const };
    if (bid.status !== "active") return { ok: false as const, reason: "LAPSED" as const };
    if (product.isSold === true) return { ok: false as const, reason: "ALREADY_SOLD" as const };

    const endDate = product.auctionEndDate ? resolveDate(product.auctionEndDate) : null;
    if (endDate && endDate.getTime() <= Date.now()) {
      return { ok: false as const, reason: "AUCTION_ENDED" as const };
    }

    const bidAmount = bid.bidAmount;
    const standingBid = typeof product.currentBid === "number" ? product.currentBid : 0;
    // `currentBid` never reflects a pending buyout (see BidDocument.isBuyout),
    // so this compares against real bidding only — exactly the check the buyer
    // passed when they started, re-run against the price as it is right now.
    if (standingBid >= bidAmount) {
      return { ok: false as const, reason: "OUTBID" as const };
    }

    tx.update(productRef, {
      isSold: true,
      availableQuantity: 0,
      // Ends the auction NOW. Everything above has already established that
      // nobody outbid the buyout price, so no bidder loses anything they would
      // otherwise have won.
      auctionEndDate: new Date(),
      currentBid: bidAmount,
      leadingBidderId: bid.userId,
      bidsHaveStarted: true,
      updatedAt: new Date(),
    });
    tx.update(bidRef, {
      status: "won",
      isWinning: true,
      updatedAt: new Date(),
    });

    return { ok: true as const, bidAmount };
  });
}

/**
 * Re-validate every locked line immediately before the order is written.
 *
 * `checkoutOffer()` already checks status/deadline/stock when the line is ADDED
 * to the cart, but nothing re-checked at order time — so a buyer could add an
 * accepted offer, wait out the 48h window, and still be charged the locked
 * price. Throws on the first invalid line; the caller's transaction aborts.
 *
 * Auction lines were skipped entirely until 2026-08-24 (`if (!item.offerId)
 * continue`), so a won auction's own `checkoutDeadline` had never been checked
 * at order time at all — and a buyout claim, which is decided here, had nowhere
 * to be decided.
 */
export async function assertLockedLinesStillValid(
  items: readonly CartItemDocument[],
  buyerUid: string,
): Promise<void> {
  const now = new Date();

  for (const item of items) {
    // --- Auction lines: deadline for every one, plus the claim for a buyout ---
    if (item.bidId || item.isAuctionWin) {
      if (item.checkoutDeadline && now > resolveDate(item.checkoutDeadline)!) {
        throw new ValidationError(
          item.isBuyout
            ? ERROR_MESSAGES.BID.BUYOUT_LAPSED
            : "The payment window for this auction win has expired.",
          { code: item.isBuyout ? BID_ERROR_CODES.BUYOUT_LAPSED : undefined },
        );
      }
      if (item.isBuyout) {
        const claim = await claimAuctionForCheckout(item, buyerUid);
        if (!claim.ok) {
          const { message, code } = CLAIM_FAILURE_ERRORS[claim.reason];
          serverLogger.info("claimAuctionForCheckout refused", {
            productId: item.auctionId ?? item.productId,
            bidId: item.bidId,
            buyerUid,
            reason: claim.reason,
          });
          throw new ValidationError(message, { code });
        }
      }
      continue;
    }

    if (!item.offerId) continue;
    const offer = await offerRepository.findById(item.offerId);
    if (!offer) {
      throw new ValidationError(
        "The offer for one of your items no longer exists. Remove it and try again.",
      );
    }
    if (offer.buyerUid !== buyerUid) {
      throw new ValidationError("This offer belongs to a different account.");
    }
    if (offer.status !== OfferStatusValues.ACCEPTED) {
      throw new ValidationError(
        offer.status === OfferStatusValues.PAID
          ? "This offer has already been used for an order."
          : "This offer is no longer accepted. Remove it from your cart and make a new offer.",
      );
    }
    if (offer.checkoutDeadline && now > offer.checkoutDeadline) {
      throw new ValidationError(
        "The checkout window for this accepted offer has expired. Please make a new offer.",
      );
    }
  }
}

/**
 * Close the loop after the order exists.
 *
 * Best-effort by design: the order is already persisted and paid-for, so a
 * failure here must be logged rather than thrown — losing the back-link is a
 * bookkeeping problem, refusing a completed order is a customer-facing one.
 */
export async function finalizeLockedLines(
  items: readonly CartItemDocument[],
  orderId: string,
): Promise<void> {
  for (const item of items) {
    if (item.offerId) {
      try {
        await offerRepository.markPaid(item.offerId, orderId);
      } catch (err) {
        void normalizeError(err);
        serverLogger.error("finalizeLockedLines: markPaid failed", {
          offerId: item.offerId,
          orderId,
        });
      }
    }
    if (item.bidId) {
      try {
        await bidRepository.attachOrder(item.bidId, orderId);
      } catch (err) {
        void normalizeError(err);
        serverLogger.error("finalizeLockedLines: attachOrder failed", {
          bidId: item.bidId,
          orderId,
        });
      }
    }
    if (item.isBuyout && item.bidId) {
      await closeOutBuyoutLosers(item.auctionId ?? item.productId, item.bidId);
    }
  }
}

/**
 * A buyout ended the auction, so everyone still bidding on it lost.
 *
 * Deliberately AFTER the claim transaction rather than inside it: the number of
 * active bids on a hot auction is unbounded, and a transaction that touches all
 * of them would either blow the 500-write limit or contend with every incoming
 * bid. The claim only has to be atomic about who gets the ITEM; tidying up the
 * losers is bookkeeping, so it is bounded, best-effort and logged.
 *
 * Their bids are `lost`, not `outbid` — the auction is over, which is the same
 * distinction `auctionSettlement` draws.
 */
async function closeOutBuyoutLosers(productId: string, winningBidId: string): Promise<void> {
  try {
    const active = await bidRepository.getActiveByProduct(productId);
    const losers = active.filter((e) => e.id !== winningBidId);
    if (losers.length === 0) return;

    await bidRepository.markManyLost(losers.map((e) => e.ref));
    serverLogger.info("finalizeLockedLines: buyout closed out losing bids", {
      productId,
      winningBidId,
      losers: losers.length,
    });
  } catch (err) {
    void normalizeError(err);
    serverLogger.error("finalizeLockedLines: buyout loser close-out failed", {
      productId,
      winningBidId,
    });
  }
}
