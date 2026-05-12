import { offerRepository, notificationRepository } from "../../../../repositories";
import type { ScheduleHandler } from "../runtime/types";

export const offerExpiryHandler: ScheduleHandler = async (ctx) => {
  ctx.logger.info("Starting offer expiry sweep");

  let expiredOffers;
  try {
    expiredOffers = await offerRepository.findExpiredActive(ctx.now);
  } catch (err) {
    ctx.logger.error("Failed to query expired offers", err);
    throw err;
  }

  if (expiredOffers.length === 0) {
    ctx.logger.info("No expired offers found");
    return;
  }

  ctx.logger.info(`Found ${expiredOffers.length} expired offer(s) to process`);

  const expiredIds: string[] = [];
  for (const offer of expiredOffers) {
    try {
      expiredIds.push(offer.id);
      await notificationRepository.create({
        userId: offer.buyerUid,
        type: "offer_expired",
        priority: "normal",
        title: "Offer expired",
        message: `Your offer on "${offer.productTitle}" expired without a response.`,
        relatedId: offer.id,
        relatedType: "offer",
      });
    } catch (err) {
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

  ctx.logger.info("Offer expiry complete", {
    processed: expiredIds.length,
    skipped: expiredOffers.length - expiredIds.length,
  });
};
