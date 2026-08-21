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
import { resolveMinBid, resolveMinBidIncrement } from "../../../_internal/shared/features/auctions/config";
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
import { ROUTES } from "../../../next/routing/route-map";
import { CART_LANE, LANE_CHECKOUT_WINDOW_MS } from "../../../_internal/shared/checkout/lanes";

/**
 * Buy-Now and auction settlement give the buyer the same 48h window to pay for
 * a locked line. Kept identical on purpose — both are "you now owe this".
 */
const AUCTION_CHECKOUT_WINDOW_MS = LANE_CHECKOUT_WINDOW_MS.auction;
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
   * Buy-Now no longer creates an order directly. It writes a LOCKED CART LINE
   * (same shape auction settlement produces for a winning bidder) and the buyer
   * completes the real order through the auction checkout lane. The old
   * behaviour created a document that no orders UI could render and no payment
   * path could reach — see auctionSettlement.ts for the full writeup.
   */
  cartLocked: true;
  productId: string;
  amount: number;
  currency: string;
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

  if (product.bidsHaveStarted === true) {
    throw new ValidationError(ERROR_MESSAGES.BID.BUY_NOW_BIDS_STARTED, { code: BID_ERROR_CODES.BUY_NOW_BIDS_STARTED });
  }

  const currency = getDefaultCurrency();

  await unitOfWork.runBatch((batch) => {
    unitOfWork.products.updateInBatch(batch, productId, {
      isSold: true,
      availableQuantity: 0,
      auctionEndDate: new Date(),
    } as any);
  });

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
    auctionId: productId,
    lockedPrice: buyNowPrice,
    checkoutDeadline: new Date(Date.now() + AUCTION_CHECKOUT_WINDOW_MS),
    locked: true,
  });

  const checkoutUrl = `${String(ROUTES.USER.CHECKOUT)}?lane=${CART_LANE.AUCTION}`;

  serverLogger.info("buyNowAuction", {
    productId,
    userId,
    amount: buyNowPrice,
  });

  return { cartLocked: true, productId, amount: buyNowPrice, currency, checkoutUrl };
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
