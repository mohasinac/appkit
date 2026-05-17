/**
 * Bid Domain Actions (appkit/features/auctions)
 *
 * Business logic for auction bidding. Auth, rate-limiting, and
 * input validation are handled by the calling server action.
 */

import { serverLogger } from "../../../monitoring";
import { bidRepository } from "../repository/bid.repository";
import { productRepository } from "../../products/repository/products.repository";
import { isAuctionListing } from "../../products/utils/listing-type";
import { userRepository } from "../../auth/repository/user.repository";
import { unitOfWork } from "../../../core/unit-of-work";
import { storeRepository } from "../../stores/repository/store.repository";
import { getAdminRealtimeDb } from "../../../providers/db-firebase";
import { maskPublicBid } from "../../../security";
import {
  ERROR_MESSAGES,
  AuthorizationError,
  ValidationError,
  NotFoundError,
} from "../../../errors";
import { BID_ERROR_CODES } from "../../../errors/error-codes";
import { increment } from "../../../contracts/field-ops";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
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

  const baseBid =
    (product.currentBid ?? 0) > 0
      ? product.currentBid!
      : (product.startingBid ?? product.price);

  const minIncrement = product.minBidIncrement ?? 100;

  // Proxy-bid semantics (eBay style): the buyer's `bidAmount` is treated as
  // their **maximum** they're willing to pay; the visible price only steps up
  // in `minIncrement` units as needed to stay ahead of the previous high bid.
  // If `autoMaxBid` is supplied explicitly it takes precedence over bidAmount
  // as the cap (lets clients separate desired-step from secret-cap).
  const newCap = Math.max(bidAmount, autoMaxBid ?? bidAmount);

  if (newCap <= baseBid) {
    throw new ValidationError(ERROR_MESSAGES.BID.BID_TOO_LOW, { code: BID_ERROR_CODES.TOO_LOW });
  }
  if (newCap < baseBid + minIncrement) {
    throw new ValidationError(ERROR_MESSAGES.BID.INCREMENT_TOO_LOW, { code: BID_ERROR_CODES.INCREMENT_VIOLATED });
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

  try {
    const rtdb = getAdminRealtimeDb();
    await rtdb.ref(`/auction-bids/${productId}`).set({
      currentBid: finalVisibleForRtdb,
      lastBid: {
        amount: finalVisibleForRtdb,
        bidderName: "Bidder",
        timestamp: Date.now(),
      },
      updatedAt: Date.now(),
    });
  } catch (rtdbErr) {
    serverLogger.warn("placeBid: RTDB write failed", {
      error: rtdbErr,
      productId,
    });
  }

  serverLogger.info("placeBid", {
    bidId: bid.id,
    productId,
    userId,
    bidAmount: visibleBid,
    maxProxyBid: newCap,
    winning: newBidWins,
  });
  return { bid };
}

export async function listBidsByProduct(
  productId: string,
  params?: { page?: number; pageSize?: number },
): Promise<FirebaseSieveResult<Omit<BidDocument, "userEmail">>> {
  const result = await bidRepository.list({
    filters: `productId==${productId}`,
    sorts: "-bidDate",
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
