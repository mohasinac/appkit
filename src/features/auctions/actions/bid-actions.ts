/**
 * Bid Domain Actions (appkit/features/auctions)
 *
 * Business logic for auction bidding. Auth, rate-limiting, and
 * input validation are handled by the calling server action.
 */

import { serverLogger } from "../../../monitoring";
import { bidRepository } from "../repository/bid.repository";
import { productRepository } from "../../products/repository/products.repository";
import { userRepository } from "../../auth/repository/user.repository";
import { unitOfWork } from "../../../core/unit-of-work";
import { getAdminRealtimeDb } from "../../../providers/db-firebase";
import { maskPublicBid } from "../../../security";
import {
  ERROR_MESSAGES,
  AuthorizationError,
  ValidationError,
  NotFoundError,
} from "../../../errors";
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

// ─── Domain Functions ──────────────────────────────────────────────────────────

export async function placeBid(
  userId: string,
  userEmail: string,
  input: PlaceBidInput,
): Promise<PlaceBidResult> {
  const { productId, bidAmount, autoMaxBid } = input;

  const product = await productRepository.findById(productId);
  if (!product) throw new NotFoundError(ERROR_MESSAGES.BID.AUCTION_NOT_FOUND);
  if (!product.isAuction)
    throw new ValidationError(ERROR_MESSAGES.BID.NOT_AN_AUCTION);

  if (product.auctionEndDate) {
    const endDate = resolveDate(product.auctionEndDate);
    if (endDate && endDate.getTime() < Date.now()) {
      throw new ValidationError(ERROR_MESSAGES.BID.AUCTION_ENDED);
    }
  }

  if (product.sellerId === userId) {
    throw new AuthorizationError(ERROR_MESSAGES.BID.OWN_AUCTION);
  }

  const minimumBid =
    (product.currentBid ?? 0) > 0
      ? product.currentBid!
      : (product.startingBid ?? product.price);

  if (bidAmount <= minimumBid) {
    throw new ValidationError(ERROR_MESSAGES.BID.BID_TOO_LOW);
  }

  const profile = await userRepository.findById(userId);

  const bid = await bidRepository.create({
    productId,
    productTitle: product.title,
    userId,
    userName: profile?.displayName ?? userEmail ?? "Anonymous",
    userEmail: profile?.email ?? userEmail ?? "",
    bidAmount,
    currency: product.currency || getDefaultCurrency(),
    bidDate: new Date(),
    ...(autoMaxBid ? { autoMaxBid } : {}),
  } as Parameters<typeof bidRepository.create>[0]);

  const allBids = await bidRepository.findBy("productId", productId);
  await unitOfWork.runBatch((batch) => {
    for (const b of allBids) {
      unitOfWork.bids.updateInBatch(batch, b.id, {
        isWinning: b.id === bid.id,
        status: b.id === bid.id ? "active" : "outbid",
      } as any);
    }
    unitOfWork.products.updateInBatch(batch, productId, {
      currentBid: bidAmount,
      bidCount: (product.bidCount ?? 0) + 1,
    } as any);
  });

  try {
    const rtdb = getAdminRealtimeDb();
    await rtdb.ref(`/auction-bids/${productId}`).set({
      currentBid: bidAmount,
      bidCount: (product.bidCount ?? 0) + 1,
      lastBid: {
        amount: bidAmount,
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
    bidAmount,
  });
  return { bid };
}

export async function listBidsByProduct(
  productId: string,
  params?: { page?: number; pageSize?: number },
): Promise<FirebaseSieveResult<Omit<BidDocument, "userEmail">>> {
  const result = await bidRepository.list({
    filters: `productId==${productId}`,
    sorts: "-bidAmount",
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
