import {
  bidRepository,
  cartRepository,
  productRepository,
  storeRepository,
} from "../../../../repositories";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import type { JobContext } from "../runtime/types";
import { AUCTION_MESSAGES } from "../handlers/messages";
import { ROUTES } from "../../../../next/routing/route-map";
import { CART_LANE, LANE_CHECKOUT_WINDOW_MS } from "../../../shared/checkout/lanes";

type AuctionProductRow = Awaited<
  ReturnType<typeof productRepository.getExpiredAuctions>
>[number]["data"];

/**
 * How long the winner has to pay before the locked cart line lapses. Mirrors
 * the accepted-offer window so both locked lanes behave the same.
 */
// Was a local `48 * 60 * 60 * 1000` here AND an identical one in bid-actions.ts
// (the Buy-Now path), with nothing linking them — changing one would have given
// the same kind of win two different deadlines depending on how it was won.
const AUCTION_CHECKOUT_WINDOW_MS = LANE_CHECKOUT_WINDOW_MS.auction;

/** Deep link the winner straight into the auction checkout lane. */
const AUCTION_CHECKOUT_URL = `${String(ROUTES.USER.CHECKOUT)}?lane=${CART_LANE.AUCTION}`;

async function settleAuction(ctx: JobContext, product: AuctionProductRow): Promise<void> {
  const activeBids = await bidRepository.getActiveByProduct(product.id);

  if (activeBids.length === 0) {
    const batch = ctx.db.batch();
    productRepository.updateStatusInBatch(batch, product.id, "archived");
    await batch.commit();
    ctx.logger.info(AUCTION_MESSAGES.NO_BIDS_LOG(product.id));
    return;
  }

  const [winnerEntry, ...loserEntries] = activeBids;

  // Reserve price. It exists on the product, is editable by the seller, is
  // shown in both dashboards, and the buyer guide promises bids below it don't
  // win — but settlement awarded activeBids[0] unconditionally until
  // 2026-08-21. A below-reserve auction ends with NO winner.
  const reserve = product.reservePrice;
  if (typeof reserve === "number" && reserve > 0 && winnerEntry.data.bidAmount < reserve) {
    const batch = ctx.db.batch();
    activeBids.forEach(({ ref }) => bidRepository.markLost(batch, ref));
    productRepository.updateStatusInBatch(batch, product.id, "archived");
    await batch.commit();

    const reserveStore = product.storeId
      ? await storeRepository.findById(product.storeId).catch(() => null)
      : null;
    if (reserveStore?.ownerId) {
      await sendNotification({
        userId: reserveStore.ownerId,
        type: "auction_ended",
        priority: "normal",
        title: AUCTION_MESSAGES.RESERVE_NOT_MET_TITLE,
        message: AUCTION_MESSAGES.RESERVE_NOT_MET_MESSAGE(
          product.title,
          winnerEntry.data.currency,
          winnerEntry.data.bidAmount,
          reserve,
        ),
        relatedId: product.id,
        relatedType: "product",
      });
    }

    await Promise.allSettled(
      activeBids.slice(0, 50).map(({ data: bid }) =>
        sendNotification({
          userId: bid.userId,
          type: "bid_lost",
          priority: "normal",
          title: AUCTION_MESSAGES.LOST_TITLE,
          message: AUCTION_MESSAGES.RESERVE_NOT_MET_BIDDER_MESSAGE(product.title),
          relatedId: product.id,
          relatedType: "product",
        }),
      ),
    );

    ctx.logger.info(`Auction ${product.id} ended below reserve — no winner`, {
      highestBid: winnerEntry.data.bidAmount,
      reservePrice: reserve,
    });
    return;
  }

  const batch = ctx.db.batch();
  bidRepository.markWon(batch, winnerEntry.ref);
  loserEntries.forEach(({ ref }) => bidRepository.markLost(batch, ref));

  // Two-axis model: mark as sold without changing publish status.
  batch.update(ctx.db.collection("products").doc(product.id), {
    isSold: true,
    availableQuantity: 0,
  });
  await batch.commit();

  // The win becomes a LOCKED CART LINE, not an order.
  //
  // Settlement used to call `orderRepository.createFromAuction`, which wrote a
  // document that was not an OrderDocument at all — flat productId/userId/
  // unitPrice, no items[], no buyerId, no paymentMethod, no shippingAddress,
  // and a Firestore auto-ID instead of the `order-…` semantic id. No orders UI
  // could render it and the manual-payment panel returned null for it, so an
  // auction winner had literally no way to pay, anywhere in the product.
  //
  // Routing the win through the cart instead means the winner goes through the
  // ONE checkout that already knows how to collect an address, charge a payment
  // method, run the high-value OTP, split per store and produce a real order.
  // Auctions stay `canAddToCart: false` for user-initiated adds — this writes
  // through the repository directly, the same deliberate bypass `checkoutOffer`
  // uses for accepted offers.
  await cartRepository.addItem(winnerEntry.data.userId, {
    productId: product.id,
    productTitle: product.title,
    productImage: product.mainImage ?? "",
    price: winnerEntry.data.bidAmount,
    currency: winnerEntry.data.currency,
    quantity: 1,
    storeId: product.storeId,
    storeName: product.storeName ?? "",
    listingType: "auction",
    isAuctionWin: true,
    auctionId: product.id,
    bidId: winnerEntry.data.id,
    lockedPrice: winnerEntry.data.bidAmount,
    checkoutDeadline: new Date(ctx.now.getTime() + AUCTION_CHECKOUT_WINDOW_MS),
    locked: true,
  });

  await sendNotification({
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
    // Previously the winner's notification linked back to the product page and
    // carried no CTA — the one place it should never send them.
    actionUrl: AUCTION_CHECKOUT_URL,
    actionLabel: AUCTION_MESSAGES.WON_ACTION_LABEL,
  });

  await Promise.allSettled(
    loserEntries.slice(0, 50).map(({ data: bid }) =>
      sendNotification({
        userId: bid.userId,
        type: "bid_lost",
        priority: "normal",
        title: AUCTION_MESSAGES.LOST_TITLE,
        message: AUCTION_MESSAGES.LOST_MESSAGE(product.title),
        relatedId: product.id,
        relatedType: "product",
      }),
    ),
  );

  ctx.logger.info(`Settled auction ${product.id}`, {
    winner: winnerEntry.data.userId,
    winningBid: winnerEntry.data.bidAmount,
    losersCount: loserEntries.length,
    bidId: winnerEntry.data.id,
  });
}

export async function runAuctionSettlement(ctx: JobContext): Promise<void> {
  if (ctx.env("FEATURE_AUCTIONS") !== "true") {
    ctx.logger.info("FEATURE_AUCTIONS disabled — skipping auction settlement");
    return;
  }
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
}
