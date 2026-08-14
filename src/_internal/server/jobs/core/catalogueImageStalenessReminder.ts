import { catalogueRepository } from "../../../../repositories";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { normalizeError } from "../../../../errors/normalize";
import { CATALOGUE_IMAGE_FRESHNESS_DAYS } from "../../../../features/catalogue/schemas/firestore";
import type { JobContext } from "../runtime/types";

const REMINDER_LEAD_DAYS = 5; // remind at day 25, 5 days before the 30-day freshness cutoff

/**
 * Daily sweep — reminds catalogue owners their photos are approaching the
 * 30-day freshness cutoff, before they hit the hard block on List/Request-
 * to-sell. Dedupes via `staleReminderSentAt` so a second run on the same
 * `lastImageUpdateAt` value doesn't re-notify.
 */
export async function runCatalogueImageStalenessReminder(ctx: JobContext): Promise<void> {
  ctx.logger.info("Starting catalogue image staleness reminder sweep");

  const cutoff = new Date(ctx.now.getTime() - (CATALOGUE_IMAGE_FRESHNESS_DAYS - REMINDER_LEAD_DAYS) * 86_400_000);
  const items = await catalogueRepository.listStale(cutoff);

  let sent = 0;
  for (const item of items) {
    if (item.staleReminderSentAt && item.staleReminderSentAt >= item.lastImageUpdateAt) {
      continue; // already reminded for this image version
    }
    try {
      await sendNotification({
        userId: item.ownerId,
        type: "system",
        priority: "normal",
        title: "Refresh your catalogue photos soon",
        message: `Photos for "${item.title}" in your catalogue will need refreshing in a few days to stay eligible for listing.`,
        actionUrl: `/user/catalogue/${item.id}/edit`,
        actionLabel: "Update photos",
        relatedId: item.id,
      });
      await catalogueRepository.update(item.id, { staleReminderSentAt: ctx.now });
      sent += 1;
    } catch (err) {
      void normalizeError(err);
      ctx.logger.error("catalogueImageStalenessReminder: failed to notify owner", {
        itemId: item.id,
        ownerId: item.ownerId,
      });
    }
  }

  ctx.logger.info("Catalogue image staleness reminder complete", { scanned: items.length, sent });
}
