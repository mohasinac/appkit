import { normalizeError } from "../../../../errors/normalize";
import { bidRepository, cartRepository, offerRepository, storeRepository } from "../../../../repositories";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import type { JobContext } from "../runtime/types";

export async function runOfferExpiry(ctx: JobContext): Promise<void> {
  ctx.logger.info("Starting offer expiry sweep");

  let expiredOffers;
  try {
    expiredOffers = await offerRepository.findExpiredActive(ctx.now);
  } catch (err) {
    ctx.logger.error("Failed to query expired offers", err);
    throw err;
  }

  // NOTE: no early return here. This job sweeps three distinct things and the
  // other two (accepted-past-deadline offers, unpaid auction wins) must still
  // run when there happen to be no expired pending/countered offers.
  if (expiredOffers.length === 0) {
    ctx.logger.info("No expired pending/countered offers found");
  } else {
    ctx.logger.info(`Found ${expiredOffers.length} expired offer(s) to process`);
  }

  const expiredIds: string[] = [];
  for (const offer of expiredOffers) {
    try {
      expiredIds.push(offer.id);
      await sendNotification({
        userId: offer.buyerUid,
        type: "offer_expired",
        priority: "normal",
        title: "Offer expired",
        message: `Your offer on "${offer.productTitle}" expired without a response.`,
        relatedId: offer.id,
        relatedType: "offer",
      });
    } catch (err) {
      void normalizeError(err);
      ctx.logger.warn(`Failed to process expiry for offer ${offer.id}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (expiredIds.length > 0) {
    try {
      await offerRepository.expireMany(expiredIds);
    } catch (err) {
      ctx.logger.error("Failed to batch-expire offers", err);
      throw err;
    }
  }

  await expireAcceptedPastCheckoutDeadline(ctx);
  await lapseUnpaidAuctionWins(ctx);

  ctx.logger.info("Offer expiry complete", {
    processed: expiredIds.length,
    skipped: expiredOffers.length - expiredIds.length,
  });
}

/**
 * The second half of the sweep, missing until 2026-08-21.
 *
 * `findExpiredActive` only looks at pending/countered offers past `expiresAt`.
 * An offer the seller ACCEPTED but the buyer never paid for stayed "accepted"
 * forever: its locked price remained claimable long after the 48h checkout
 * window the buyer was shown, and the seller had no way to take the listing
 * back. This lapses those offers and clears the matching locked cart lines, so
 * the lane gate stops blocking a buyer on an offer that is no longer live.
 */
async function expireAcceptedPastCheckoutDeadline(ctx: JobContext): Promise<void> {
  let stale;
  try {
    stale = await offerRepository.findExpiredAccepted(ctx.now);
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("Failed to query accepted-but-unpaid offers", err);
    return;
  }

  if (stale.length === 0) return;
  ctx.logger.info(`Found ${stale.length} accepted offer(s) past their checkout deadline`);

  const ids: string[] = [];
  for (const offer of stale) {
    try {
      // Drop the locked cart line first — leaving it behind would keep the
      // buyer's offer lane non-empty and block their standard checkout on an
      // offer they can no longer act on.
      await cartRepository.removeItemsByOfferId(offer.buyerUid, offer.id);
      ids.push(offer.id);
      await sendNotification({
        userId: offer.buyerUid,
        type: "offer_expired",
        priority: "normal",
        title: "Accepted offer expired",
        message: `The checkout window for your accepted offer on "${offer.productTitle}" has closed. You can make a new offer if it's still listed.`,
        relatedId: offer.id,
        relatedType: "offer",
      });
    } catch (err) {
      void normalizeError(err);
      ctx.logger.warn(`Failed to lapse accepted offer ${offer.id}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (ids.length > 0) {
    try {
      await offerRepository.expireMany(ids);
    } catch (err) {
      void normalizeError(err);
      ctx.logger.error("Failed to batch-expire accepted offers", err);
    }
  }
}

/**
 * A won auction the buyer never paid for.
 *
 * Folded into this job rather than given its own scheduled function: both are
 * "a locked cart line whose claim has lapsed", they want the same cadence, and
 * Cloud Scheduler bills per registered job (see CLAUDE.md's Firebase budget
 * table — 27 jobs is already an accepted, documented cost).
 *
 * The listing is NOT silently relisted. A forfeited win is a seller decision
 * (relist, offer to the runner-up, or ban the non-payer), so this clears the
 * line, marks the bid forfeited, and notifies both sides.
 */
async function lapseUnpaidAuctionWins(ctx: JobContext): Promise<void> {
  let stale;
  try {
    stale = await cartRepository.findExpiredLockedLines(ctx.now);
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("Failed to scan for expired locked cart lines", err);
    return;
  }

  const auctionLines = stale.filter(({ item }) => item.bidId && item.isAuctionWin);
  if (auctionLines.length === 0) return;
  ctx.logger.info(`Found ${auctionLines.length} unpaid auction win(s) past deadline`);

  /**
   * Tell the seller their item is unsold again so they can relist it or approach
   * the runner-up. Only the buyer was ever notified, so to a seller a forfeited
   * win looked like a completed sale that simply never paid out.
   *
   * Best-effort by design: the forfeiture itself (cart line cleared, bid marked
   * forfeited) is already committed by the time this runs, and a missing store or
   * a notification failure must not roll that back or abort the sweep.
   */
  async function notifySellerOfForfeitedWin(
    item: (typeof auctionLines)[number]["item"],
    jobCtx: JobContext,
  ): Promise<void> {
    try {
      const store = item.storeId ? await storeRepository.findById(item.storeId) : null;
      if (!store?.ownerId) return;
      await sendNotification({
        userId: store.ownerId,
        type: "auction_ended",
        priority: "normal",
        title: "Auction win forfeited — item unsold",
        message: `The winning bidder for "${item.productTitle}" did not pay within the deadline, so the win was forfeited. You can relist the item or approach the next highest bidder.`,
        relatedId: item.auctionId ?? item.productId,
        relatedType: "product",
      });
    } catch (sellerErr) {
      void normalizeError(sellerErr);
      jobCtx.logger.warn(`Failed to notify seller of forfeited win ${item.bidId}`, {
        error: sellerErr instanceof Error ? sellerErr.message : String(sellerErr),
      });
    }
  }

  for (const { userId, item } of auctionLines) {
    try {
      await cartRepository.removeItemsByBidId(userId, item.bidId!);
      await bidRepository.markForfeited(item.bidId!);
      await sendNotification({
        userId,
        type: "auction_ended",
        priority: "high",
        title: "Auction win forfeited",
        message: `You didn't complete payment for "${item.productTitle}" in time, so the win has been forfeited. Repeated non-payment can restrict your account.`,
        relatedId: item.auctionId ?? item.productId,
        relatedType: "product",
      });

      await notifySellerOfForfeitedWin(item, ctx);
    } catch (err) {
      void normalizeError(err);
      ctx.logger.warn(`Failed to lapse auction win ${item.bidId}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
