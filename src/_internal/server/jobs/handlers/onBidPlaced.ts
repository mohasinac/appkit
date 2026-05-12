import {
  bidRepository,
  notificationRepository,
  productRepository,
} from "../../../../repositories";
import { decryptPii } from "../../../../security/index";
import { getAdminRealtimeDb } from "../../../../providers/db-firebase";
import type { FirestoreTriggerHandler } from "../runtime/types";
import { BID_MESSAGES } from "./messages";

const BIDS_COLLECTION = "bids";

interface NewBid {
  id: string;
  productId: string;
  productTitle: string;
  userId: string;
  userName: string;
  bidAmount: number;
  currency: string;
}

export const onBidPlacedHandler: FirestoreTriggerHandler<null, NewBid> = async (event, ctx) => {
  const newBid = event.after;
  if (!newBid) {
    ctx.logger.error("No snapshot data", null);
    return;
  }
  newBid.userName = decryptPii(newBid.userName) as string;

  try {
    const prevWinning = await bidRepository.getWinningBid(newBid.productId);
    const batch = ctx.db.batch();
    const newBidRef = ctx.db.collection(BIDS_COLLECTION).doc(event.params.bidId);
    bidRepository.markWinning(batch, newBidRef);

    let outbidUserId: string | null = null;
    if (prevWinning && prevWinning.data.userId !== newBid.userId) {
      outbidUserId = prevWinning.data.userId;
      bidRepository.markOutbid(batch, prevWinning.ref);
      notificationRepository.createInBatch(batch, {
        userId: outbidUserId,
        type: "bid_outbid",
        priority: "high",
        title: BID_MESSAGES.OUTBID_TITLE,
        message: BID_MESSAGES.OUTBID_MESSAGE(newBid.productTitle, newBid.currency, newBid.bidAmount),
        relatedId: newBid.productId,
        relatedType: "product",
      });
    }

    productRepository.incrementBidCountInBatch(batch, newBid.productId, newBid.bidAmount);
    await batch.commit();

    try {
      if (outbidUserId) {
        await getAdminRealtimeDb()
          .ref(`notifications/${outbidUserId}`)
          .push({
            type: "bid_outbid",
            title: BID_MESSAGES.OUTBID_TITLE,
            message: BID_MESSAGES.OUTBID_MESSAGE(
              newBid.productTitle,
              newBid.currency,
              newBid.bidAmount,
            ),
            timestamp: Date.now(),
            read: false,
          });
      }
    } catch (rtdbError) {
      ctx.logger.error("Realtime DB push failed (non-fatal)", rtdbError);
    }

    ctx.logger.info(`Bid placed on ${newBid.productId}`, {
      bidId: event.params.bidId,
      amount: newBid.bidAmount,
      outbidUserId,
    });
  } catch (error) {
    ctx.logger.error("Error handling bid placement", error, {
      bidId: event.params.bidId,
      productId: newBid.productId,
    });
    throw error;
  }
};
