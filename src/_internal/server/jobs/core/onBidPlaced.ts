import {
  bidRepository,
  productRepository,
} from "../../../../repositories";
import { decryptPii } from "../../../../security/index";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { getAdminRealtimeDb } from "../../../../providers/db-firebase";
import type { JobContext } from "../runtime/types";
import { BID_MESSAGES } from "../handlers/messages";

const BIDS_COLLECTION = "bids";

export interface NewBid {
  id: string;
  productId: string;
  productTitle: string;
  userId: string;
  userName: string;
  bidAmount: number;
  currency: string;
}

export interface HandleBidPlacedInput {
  bidId: string;
  bid: NewBid;
}

export async function handleBidPlaced(
  input: HandleBidPlacedInput,
  ctx: JobContext,
): Promise<void> {
  const { bidId, bid: newBid } = input;
  newBid.userName = decryptPii(newBid.userName) as string;

  try {
    const prevWinning = await bidRepository.getWinningBid(newBid.productId);
    const batch = ctx.db.batch();
    const newBidRef = ctx.db.collection(BIDS_COLLECTION).doc(bidId);
    bidRepository.markWinning(batch, newBidRef);

    let outbidUserId: string | null = null;
    if (prevWinning && prevWinning.data.userId !== newBid.userId) {
      outbidUserId = prevWinning.data.userId;
      bidRepository.markOutbid(batch, prevWinning.ref);
    }

    productRepository.incrementBidCountInBatch(batch, newBid.productId, newBid.bidAmount, newBid.userId);
    await batch.commit();

    if (outbidUserId) {
      const outbidMessage = BID_MESSAGES.OUTBID_MESSAGE(newBid.productTitle, newBid.currency, newBid.bidAmount);

      await sendNotification({
        userId: outbidUserId,
        type: "bid_outbid",
        priority: "high",
        title: BID_MESSAGES.OUTBID_TITLE,
        message: outbidMessage,
        relatedId: newBid.productId,
        relatedType: "product",
      });

      try {
        await getAdminRealtimeDb()
          .ref(`notifications/${outbidUserId}`)
          .push({
            type: "bid_outbid",
            title: BID_MESSAGES.OUTBID_TITLE,
            message: outbidMessage,
            timestamp: Date.now(),
            read: false,
          });
      } catch (rtdbError) {
        ctx.logger.error("Realtime DB push failed (non-fatal)", rtdbError);
      }
    }

    ctx.logger.info(`Bid placed on ${newBid.productId}`, {
      bidId,
      amount: newBid.bidAmount,
      outbidUserId,
    });
  } catch (error) {
    ctx.logger.error("Error handling bid placement", error, {
      bidId,
      productId: newBid.productId,
    });
    throw error;
  }
}
