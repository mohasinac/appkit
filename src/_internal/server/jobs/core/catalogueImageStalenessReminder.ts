import { normalizeError } from "../../../../errors/normalize";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { catalogueRepository } from "../../../../repositories";
import { CATALOGUE_IMAGE_FRESHNESS_DAYS } from "../../../../features/catalogue/schemas/firestore";
import type { JobContext } from "../runtime/types";

const REMINDER_LEAD_DAYS = 5;
const DAY_MS = 86_400_000;

/**
 * Daily sweep — nudges catalogue owners whose photos are approaching (or
 * past) the freshness cutoff (`assertCatalogueImagesFresh`'s 30-day gate),
 * so the "List" / "Request to sell" block doesn't come as a surprise.
 * `staleReminderSentAt` gates re-notification: only fires again once
 * `lastImageUpdateAt` has moved past the previous reminder (i.e. the owner
 * uploaded a fresh photo and then let it go stale again).
 */
export async function runCatalogueImageStalenessReminder(ctx: JobContext): Promise<void> {
  ctx.logger.info("Catalogue image staleness reminder sweep starting");

  const reminderCutoff = new Date(ctx.now.getTime() - (CATALOGUE_IMAGE_FRESHNESS_DAYS - REMINDER_LEAD_DAYS) * DAY_MS);
  const items = await catalogueRepository.listStale(reminderCutoff, 200);

  let remindersSent = 0;

  for (const item of items) {
    if (item.listingStatus === "listed") continue; // already listed — no gate left to hit
    const lastUpdate = new Date(item.lastImageUpdateAt);
    if (item.staleReminderSentAt && new Date(item.staleReminderSentAt) >= lastUpdate) continue; // already reminded for this image set

    try {
      await sendNotification({
        userId: item.ownerId,
        type: "catalogue_images_stale",
        priority: "normal",
        title: "Refresh your catalogue photos",
        message: `Photos for "${item.title}" are getting old — refresh them within ${CATALOGUE_IMAGE_FRESHNESS_DAYS - REMINDER_LEAD_DAYS} days or you won't be able to list it.`,
        relatedId: item.id,
        relatedType: "catalogueItem",
        actionUrl: `/user/catalogue/${item.id}/edit`,
      } as never);
      await catalogueRepository.update(item.id, { staleReminderSentAt: ctx.now });
      remindersSent++;
    } catch (err) {
      void normalizeError(err);
      ctx.logger.warn("Catalogue staleness reminder notification failed", {
        itemId: item.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  ctx.logger.info("Catalogue image staleness reminder sweep complete", { remindersSent });
}
