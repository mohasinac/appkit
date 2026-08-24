import { normalizeError } from "../../../errors/normalize";
/**
 * Bid Domain Actions (appkit/features/auctions)
 *
 * Business logic for auction bidding. Auth, rate-limiting, and
 * input validation are handled by the calling server action.
 */

import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit";
import { sortBy } from "@mohasinac/appkit";
import { serverLogger } from "../../../monitoring";
import { bidRepository } from "../repository/bid.repository";
import { productRepository } from "../../products/repository/products.repository";
import { isAuctionListing } from "../../products/utils/listing-type";
import { userRepository } from "../../auth/repository/user.repository";
import { unitOfWork } from "../../../core/unit-of-work";
import { storeRepository } from "../../stores/repository/store.repository";
import { siteSettingsRepository } from "../../../repositories";
import { getAdminRealtimeDb } from "../../../providers/db-firebase";
import { maskPublicBid } from "../../../security";
import {
  isBuyNowAvailable,
  resolveMinBid,
  resolveMinBidIncrement,
} from "../../../_internal/shared/features/auctions/config";
import { sendNotification } from "../../admin/actions/notification-actions";
import { BID_MESSAGES } from "../../../_internal/server/jobs/handlers/messages";
import {
  ERROR_MESSAGES,
  AuthorizationError,
  ValidationError,
  NotFoundError,
} from "../../../errors";
import { BID_ERROR_CODES } from "../../../errors/error-codes";
import { increment } from "../../../contracts/field-ops";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import { cartRepository } from "../../cart/repository/cart.repository";
import {
  AUCTION_BUYOUT_WINDOW_MINUTES,
  AUCTION_BUYOUT_WINDOW_MS,
  AUCTION_CHECKOUT_URL,
} from "../../../_internal/shared/checkout/lanes";
import { resolveDate } from "../../../utils";
import type { BidDocument } from "../schemas";
import type { FirebaseSieveResult } from "../../../providers/db-firebase";

export interface PlaceBidInput {
  productId: string;
  bidAmount: number;
  autoMaxBid?: number;
}

export interface PlaceBidResult {
  bid: BidDocument;
}

// --- Domain Functions ----------------------------------------------------------

export async function placeBid(
  userId: string,
  userEmail: string,
  input: PlaceBidInput,
): Promise<PlaceBidResult> {
  const { productId, bidAmount, autoMaxBid } = input;

  const product = await productRepository.findById(productId);
  if (!product) throw new NotFoundError(ERROR_MESSAGES.BID.AUCTION_NOT_FOUND);
  if (!isAuctionListing(product))
    throw new ValidationError(ERROR_MESSAGES.BID.NOT_AN_AUCTION);

  if (product.isSold) {
    throw new ValidationError(ERROR_MESSAGES.BID.AUCTION_ENDED, { code: BID_ERROR_CODES.AUCTION_ENDED });
  }

  if (product.auctionEndDate) {
    const endDate = resolveDate(product.auctionEndDate);
    if (endDate && endDate.getTime() < Date.now()) {
      throw new ValidationError(ERROR_MESSAGES.BID.AUCTION_ENDED, { code: BID_ERROR_CODES.AUCTION_ENDED });
    }
  }

  if (product.storeId) {
    const store = await storeRepository.findById(product.storeId);
    if (store?.ownerId === userId) {
      throw new AuthorizationError(ERROR_MESSAGES.BID.OWN_AUCTION);
    }
  }

  // An auction with no bids yet prices off its starting bid, and that starting
  // bid is itself acceptable — see ResolveMinBidOptions.hasBids.
  const hasBids = (product.currentBid ?? 0) > 0 || (product.bidCount ?? 0) > 0;
  const baseBid = hasBids
    ? (product.currentBid ?? product.startingBid ?? product.price)
    : (product.startingBid ?? product.price);

  const settings = await siteSettingsRepository.getSingleton();
  const tiers = settings.auctionConfig?.bidIncrementTiers ?? [];
  const minIncrement = resolveMinBidIncrement(baseBid, tiers, product.minBidIncrement);
  // Identical derivation to the bid form's, via the one shared helper — the
  // form seeds `resolveMinBid(...)` and this rejects below it, so the two can
  // never disagree about what the auction will accept.
  const minAcceptableBid = resolveMinBid(baseBid, tiers, product.minBidIncrement, { hasBids });

  // Proxy-bid semantics (eBay style): the buyer's `bidAmount` is treated as
  // their **maximum** they're willing to pay; the visible price only steps up
  // in `minIncrement` units as needed to stay ahead of the previous high bid.
  // If `autoMaxBid` is supplied explicitly it takes precedence over bidAmount
  // as the cap (lets clients separate desired-step from secret-cap).
  const newCap = Math.max(bidAmount, autoMaxBid ?? bidAmount);

  if (newCap < minAcceptableBid) {
    // Both rejections stay distinguishable: "below the standing price" and
    // "above it but short of the increment" are different mistakes and the
    // form maps their codes to different copy. With no bids yet only the
    // former is reachable, since the minimum IS the starting bid.
    const isIncrementViolation = hasBids && newCap > baseBid;
    throw new ValidationError(
      isIncrementViolation
        ? ERROR_MESSAGES.BID.INCREMENT_TOO_LOW
        : ERROR_MESSAGES.BID.BID_TOO_LOW,
      {
        code: isIncrementViolation
          ? BID_ERROR_CODES.INCREMENT_VIOLATED
          : BID_ERROR_CODES.TOO_LOW,
      },
    );
  }

  const previousWinner = await bidRepository
    .getWinningBid(productId)
    .catch(() => null);

  const prevCap = previousWinner?.data
    ? ((previousWinner.data as any).autoMaxBid ?? previousWinner.data.bidAmount ?? baseBid)
    : baseBid;
  const prevVisible = previousWinner?.data?.bidAmount ?? baseBid;
  const sameBidder = previousWinner?.data?.userId === userId;

  // Decide who wins after this submission and what the visible price becomes.
  // Tie goes to the existing leader (first-bidder advantage), matching eBay.
  let newBidWins: boolean;
  let visibleBid: number;
  let bumpedPreviousVisible: number | null = null;

  if (sameBidder) {
    // Raising your own cap. You stay winning; visible stays put.
    newBidWins = true;
    visibleBid = prevVisible;
  } else if (!hasBids) {
    // Opening bid: the price displays at the seller's starting bid, not at
    // `startingBid + increment`, because there is nobody to outpace yet. Under
    // proxy semantics the submission is a maximum, so without this an opening
    // max of ₹500 on a ₹100 auction would be recorded at ₹200 for no reason.
    newBidWins = true;
    visibleBid = baseBid;
  } else if (!previousWinner || newCap > prevCap) {
    newBidWins = true;
    const target = Math.max(prevCap + minIncrement, baseBid + minIncrement);
    visibleBid = Math.min(newCap, target);
  } else {
    // newCap <= prevCap → previous winner keeps it. Bump their visible up to
    // outpace the new bid (capped at their own max).
    newBidWins = false;
    const target = newCap + minIncrement;
    visibleBid = newCap;
    bumpedPreviousVisible = Math.min(prevCap, target);
  }

  const profile = await userRepository.findById(userId);

  const bid = await bidRepository.create({
    productId,
    productTitle: product.title,
    userId,
    userName: profile?.displayName ?? userEmail ?? "Anonymous",
    userEmail: profile?.email ?? userEmail ?? "",
    bidAmount: visibleBid,
    currency: product.currency || getDefaultCurrency(),
    bidDate: new Date(),
    autoMaxBid: newCap,
  } as Parameters<typeof bidRepository.create>[0]);

  await unitOfWork.runBatch((batch) => {
    if (previousWinner && previousWinner.data.id !== bid.id) {
      if (newBidWins) {
        unitOfWork.bids.updateInBatch(batch, previousWinner.data.id, {
          isWinning: false,
          status: "outbid",
        } as any);
      } else if (bumpedPreviousVisible !== null && bumpedPreviousVisible !== prevVisible) {
        unitOfWork.bids.updateInBatch(batch, previousWinner.data.id, {
          bidAmount: bumpedPreviousVisible,
        } as any);
      }
    }
    unitOfWork.bids.updateInBatch(batch, bid.id, {
      isWinning: newBidWins,
      status: newBidWins ? "active" : "outbid",
    } as any);
    const finalCurrentBid = newBidWins ? visibleBid : (bumpedPreviousVisible ?? prevVisible);
    unitOfWork.products.updateInBatch(batch, productId, {
      currentBid: finalCurrentBid,
      bidCount: increment(1),
      leadingBidderId: newBidWins ? userId : (previousWinner?.data?.userId ?? userId),
      bidsHaveStarted: true,
    } as any);
  });

  const finalVisibleForRtdb = newBidWins ? visibleBid : (bumpedPreviousVisible ?? prevVisible);
  const finalBidCountForRtdb = (product.bidCount ?? 0) + 1;

  try {
    const rtdb = getAdminRealtimeDb();
    await rtdb.ref(`/auction-bids/${productId}`).set({
      currentBid: finalVisibleForRtdb,
      bidCount: finalBidCountForRtdb,
      lastBid: {
        amount: finalVisibleForRtdb,
        bidderName: bid.userName,
        timestamp: Date.now(),
      },
      updatedAt: Date.now(),
    });
  } catch (rtdbErr) {
    void normalizeError(rtdbErr);
    serverLogger.warn("placeBid: RTDB write failed", {
      error: rtdbErr,
      productId,
    });
  }

  // Outbid notification.
  //
  // This used to live in the `onBidPlaced` Firestore trigger, which derived the
  // outbid user by re-reading `getWinningBid()` AFTER the fact. That read raced
  // the batch above (the bid doc is created before the batch commits, so the
  // trigger could observe either side of it) and so notified the wrong user, or
  // nobody, non-deterministically. Here the outcome is already known exactly:
  // `previousWinner` plus `newBidWins` say who lost the lead and who kept it.
  //
  // Best-effort, like the RTDB mirror above — a failed notification must never
  // fail a bid that has already been committed.
  const outbidUserId =
    newBidWins && previousWinner && previousWinner.data.userId !== userId
      ? previousWinner.data.userId
      : null;

  if (outbidUserId) {
    try {
      await sendNotification({
        userId: outbidUserId,
        type: "bid_outbid",
        priority: "high",
        title: BID_MESSAGES.OUTBID_TITLE,
        message: BID_MESSAGES.OUTBID_MESSAGE(
          product.title,
          product.currency || getDefaultCurrency(),
          finalVisibleForRtdb,
        ),
        relatedId: productId,
        relatedType: "product",
      });
    } catch (notifyErr) {
      void normalizeError(notifyErr);
      serverLogger.warn("placeBid: outbid notification failed", {
        error: notifyErr,
        productId,
        outbidUserId,
      });
    }
  }

  serverLogger.info("placeBid", {
    bidId: bid.id,
    productId,
    userId,
    bidAmount: visibleBid,
    maxProxyBid: newCap,
    winning: newBidWins,
    outbidUserId,
  });
  return { bid };
}

// --- Buy Now (auction direct-purchase) ----------------------------------------

export interface BuyNowAuctionInput {
  productId: string;
}

export interface BuyNowAuctionResult {
  /**
   * Buy-Now creates neither an order nor a sale. It places a real BID at the
   * listing's buy-now price and writes a LOCKED CART LINE pointing at it; the
   * buyer then completes a normal order through the auction checkout lane, and
   * only THAT closes the auction (see `claimAuctionForCheckout`).
   *
   * Two earlier shapes were both wrong. The original created an order document
   * no orders UI could render and no payment path could reach (see
   * auctionSettlement.ts). Its replacement wrote a locked cart line with no
   * `bidId`, which every downstream sweep filters on — so the line could never
   * lapse, could never be removed (it is `locked: true`), and permanently
   * blocked the buyer's other two lanes.
   *
   * The auction itself is deliberately left ALONE here. It keeps running, keeps
   * taking bids, and keeps accepting other buyouts. Nothing is sold until
   * somebody pays, and which of several racing buyers that is gets decided by a
   * transaction at order time rather than by a first-come lock here.
   */
  cartLocked: true;
  productId: string;
  amount: number;
  currency: string;
  /** The bid placed at the buy-now price. Won only once the order completes. */
  bidId: string;
  /** When this claim lapses — 1h, clamped to the auction's own end time. */
  checkoutDeadline: Date;
  /** Where to send the buyer to actually pay. */
  checkoutUrl: string;
}

export async function buyNowAuction(
  userId: string,
  userName: string,
  userEmail: string,
  input: BuyNowAuctionInput,
): Promise<BuyNowAuctionResult> {
  const { productId } = input;

  const product = await productRepository.findById(productId);
  if (!product) throw new NotFoundError(ERROR_MESSAGES.BID.AUCTION_NOT_FOUND);
  if (!isAuctionListing(product))
    throw new ValidationError(ERROR_MESSAGES.BID.NOT_AN_AUCTION);

  if (product.isSold) {
    throw new ValidationError(ERROR_MESSAGES.BID.AUCTION_ENDED, { code: BID_ERROR_CODES.AUCTION_ENDED });
  }

  if (product.auctionEndDate) {
    const endDate = resolveDate(product.auctionEndDate);
    if (endDate && endDate.getTime() < Date.now()) {
      throw new ValidationError(ERROR_MESSAGES.BID.AUCTION_ENDED, { code: BID_ERROR_CODES.AUCTION_ENDED });
    }
  }

  if (product.storeId) {
    const store = await storeRepository.findById(product.storeId);
    if (store?.ownerId === userId) {
      throw new AuthorizationError(ERROR_MESSAGES.BID.OWN_AUCTION);
    }
  }

  const buyNowPrice = typeof product.buyNowPrice === "number" ? product.buyNowPrice : null;
  if (buyNowPrice === null || buyNowPrice <= 0) {
    throw new ValidationError(ERROR_MESSAGES.BID.BUY_NOW_NO_PRICE, { code: BID_ERROR_CODES.BUY_NOW_NO_PRICE });
  }

  // The standing price this buyout has to beat. Read from the bids as well as
  // the product because `product.currentBid` is a denormalised mirror, and a
  // pending buyout deliberately never writes to it (see BidDocument.isBuyout) —
  // so the bids are the authority here and buyout bids are excluded from it.
  const activeBids = await bidRepository.getActiveByProduct(productId);
  const standingBid = Math.max(
    product.currentBid ?? 0,
    ...activeBids.filter((e) => e.data.isBuyout !== true).map((e) => e.data.bidAmount ?? 0),
    0,
  );

  // Replaces the old `bidsHaveStarted` gate. Buy Now used to vanish the instant
  // anybody bid, eBay-style, which hid it on almost every real auction. What
  // actually matters is whether it is still a better deal than the bidding.
  if (!isBuyNowAvailable({ buyNowPrice, currentBid: standingBid, isEnded: false, isSold: product.isSold })) {
    throw new ValidationError(ERROR_MESSAGES.BID.BUY_NOW_UNAVAILABLE, {
      code: BID_ERROR_CODES.BUY_NOW_UNAVAILABLE,
    });
  }

  // Idempotency, NOT exclusivity. Re-clicking Buy Now (or a double submit) must
  // not stack a second hold on the same buyer — but a DIFFERENT buyer holding
  // one is fine and deliberate: whoever pays first gets it.
  const existingHold = activeBids.find(
    (e) => e.data.isBuyout === true && e.data.userId === userId,
  );
  if (existingHold) {
    return {
      cartLocked: true,
      productId,
      amount: existingHold.data.bidAmount,
      currency: existingHold.data.currency,
      bidId: existingHold.data.id,
      checkoutDeadline: new Date(Date.now() + AUCTION_BUYOUT_WINDOW_MS),
      checkoutUrl: AUCTION_CHECKOUT_URL,
    };
  }

  // The product's own currency, not the site default — the cart line, the bid
  // and the listing all have to agree, and settlement uses the bid's currency.
  const currency = product.currency || getDefaultCurrency();
  const profile = await userRepository.findById(userId);

  // A real bid at the buy-now price — this is what "the bid placed is the
  // buyout price by the buyer" means. It starts `active`/`isWinning: false`
  // like any other bid (bidRepository.create forces both) and is promoted to
  // `won` by claimAuctionForCheckout when the order actually lands.
  const bid = await bidRepository.create({
    productId,
    productTitle: product.title,
    userId,
    userName: profile?.displayName ?? userName ?? userEmail ?? "Anonymous",
    userEmail: profile?.email ?? userEmail ?? "",
    bidAmount: buyNowPrice,
    currency,
    bidDate: new Date(),
    autoMaxBid: buyNowPrice,
    isBuyout: true,
  } as Parameters<typeof bidRepository.create>[0]);

  // Clamped to the auction's own end: a buyout that hasn't been paid for by the
  // time the clock runs out fails anyway, because settlement will have awarded
  // the item to whoever actually won the bidding. Showing a deadline past that
  // point would promise a window that does not exist.
  const auctionEnd = product.auctionEndDate ? resolveDate(product.auctionEndDate) : null;
  const softDeadline = Date.now() + AUCTION_BUYOUT_WINDOW_MS;
  const checkoutDeadline = new Date(
    auctionEnd ? Math.min(softDeadline, auctionEnd.getTime()) : softDeadline,
  );

  // Locked cart line, not an order — see BuyNowAuctionResult above. Written
  // through the repository directly (auctions are canAddToCart:false for
  // user-initiated adds), the same deliberate bypass checkoutOffer uses.
  await cartRepository.addItem(userId, {
    productId,
    productTitle: product.title,
    productImage: product.mainImage ?? "",
    price: buyNowPrice,
    currency,
    quantity: 1,
    storeId: product.storeId,
    storeName: product.storeName ?? "",
    listingType: "auction",
    isAuctionWin: true,
    isBuyout: true,
    auctionId: productId,
    bidId: bid.id,
    lockedPrice: buyNowPrice,
    checkoutDeadline,
    locked: true,
  });

  // Best-effort, exactly like placeBid's outbid notice: the hold is already
  // committed and a failed notification must never undo it.
  try {
    await sendNotification({
      userId,
      type: "bid_won",
      priority: "high",
      title: BID_MESSAGES.BUY_NOW_HELD_TITLE,
      message: BID_MESSAGES.BUY_NOW_HELD_MESSAGE(
        product.title,
        currency,
        buyNowPrice,
        AUCTION_BUYOUT_WINDOW_MINUTES,
      ),
      relatedId: productId,
      relatedType: "product",
      actionUrl: AUCTION_CHECKOUT_URL,
      actionLabel: BID_MESSAGES.BUY_NOW_HELD_ACTION,
    });
  } catch (notifyErr) {
    void normalizeError(notifyErr);
    serverLogger.warn("buyNowAuction: hold notification failed", {
      error: notifyErr,
      productId,
      userId,
    });
  }

  serverLogger.info("buyNowAuction", {
    productId,
    userId,
    bidId: bid.id,
    amount: buyNowPrice,
    checkoutDeadline: checkoutDeadline.toISOString(),
  });

  return {
    cartLocked: true,
    productId,
    amount: buyNowPrice,
    currency,
    bidId: bid.id,
    checkoutDeadline,
    checkoutUrl: AUCTION_CHECKOUT_URL,
  };
}

export async function listBidsByProduct(
  productId: string,
  params?: { page?: number; pageSize?: number },
): Promise<FirebaseSieveResult<Omit<BidDocument, "userEmail">>> {
  const result = await bidRepository.list({
    filters: sieveFilter("productId", SIEVE_OP.EQ, productId),
    sorts: sortBy("bidDate", "DESC"),
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
  });
  return {
    ...result,
    items: result.items.map(({ userEmail: _strip, ...rest }) =>
      maskPublicBid(rest),
    ),
  };
}

export async function getBidById(id: string): Promise<BidDocument | null> {
  return bidRepository.findById(id);
}
