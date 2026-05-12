import {
  bidRepository,
  notificationRepository,
  orderRepository,
  productRepository,
} from "../../../../repositories";
import { ProductStatusValues } from "../../../../features/products/schemas/firestore";
import type { ScheduleHandler, JobContext } from "../runtime/types";
import { AUCTION_MESSAGES } from "./messages";

type AuctionProductRow = Awaited<
  ReturnType<typeof productRepository.getExpiredAuctions>
>[number]["data"];

async function settleAuction(ctx: JobContext, product: AuctionProductRow): Promise<void> {
  const activeBids = await bidRepository.getActiveByProduct(product.id);
  const batch = ctx.db.batch();

  if (activeBids.length === 0) {
    productRepository.updateStatusInBatch(batch, product.id, ProductStatusValues.OUT_OF_STOCK);
    await batch.commit();
    ctx.logger.info(AUCTION_MESSAGES.NO_BIDS_LOG(product.id));
    return;
  }

  const [winnerEntry, ...loserEntries] = activeBids;
  bidRepository.markWon(batch, winnerEntry.ref);
  loserEntries.forEach(({ ref }) => bidRepository.markLost(batch, ref));

  const orderRef = orderRepository.createFromAuction(batch, {
    productId: product.id,
    productTitle: product.title,
    userId: winnerEntry.data.userId,
    userName: winnerEntry.data.userName,
    userEmail: winnerEntry.data.userEmail,
    storeId: product.storeId,
    amount: winnerEntry.data.bidAmount,
    currency: winnerEntry.data.currency,
    auctionProductId: product.id,
  });

  productRepository.updateStatusInBatch(batch, product.id, ProductStatusValues.SOLD);
  notificationRepository.createInBatch(batch, {
    userId: winnerEntry.data.userId,
    type: "bid_won",
    priority: "high",
    title: AUCTION_MESSAGES.WON_TITLE,
    message: AUCTION_MESSAGES.WON_MESSAGE(
      product.title,
      winnerEntry.data.currency,
      winnerEntry.data.bidAmount,
    ),
    relatedId: product.id,
    relatedType: "product",
  });

  loserEntries.slice(0, 50).forEach(({ data: bid }) => {
    notificationRepository.createInBatch(batch, {
      userId: bid.userId,
      type: "bid_lost",
      priority: "normal",
      title: AUCTION_MESSAGES.LOST_TITLE,
      message: AUCTION_MESSAGES.LOST_MESSAGE(product.title),
      relatedId: product.id,
      relatedType: "product",
    });
  });

  await batch.commit();

  ctx.logger.info(`Settled auction ${product.id}`, {
    winner: winnerEntry.data.userId,
    winningBid: winnerEntry.data.bidAmount,
    losersCount: loserEntries.length,
    orderId: orderRef.id,
  });
}

export const auctionSettlementHandler: ScheduleHandler = async (ctx) => {
  ctx.logger.info("Starting auction settlement sweep");

  const expired = await productRepository.getExpiredAuctions(ctx.now);
  if (expired.length === 0) {
    ctx.logger.info("No expired auctions found");
    return;
  }

  ctx.logger.info(`Found ${expired.length} expired auction(s) to settle`);
  const results = await Promise.allSettled(
    expired.map(({ data }) => settleAuction(ctx, data)),
  );
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    ctx.logger.error(`${failed.length} auction(s) failed to settle`, failed);
  }
  ctx.logger.info(
    `Settlement complete — ${expired.length - failed.length} succeeded, ${failed.length} failed`,
  );
};
