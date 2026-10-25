import { normalizeError } from "../../../../errors/normalize";
import { notificationRepository } from "../../../../features/admin/repository/notification.repository";
import { conversationsRepository } from "../../../../features/messages/repository/conversations.repository";
import {
  CONVERSATION_ACTIVE_DAYS,
  CONVERSATION_ARCHIVE_DAYS,
} from "../../../../features/messages/schemas/firestore";
import {
  deleteAllMessages,
  listAllAttachmentUrls,
} from "../../../../features/messages/repository/messages.repository";
import { mediaAssetsRepository } from "../../../../features/media/repository/media-assets.repository";
import { getAdminStorageLite } from "../../../../providers/db-firebase/admin-storage-lite";
import type { JobContext } from "../runtime/types";
import { NOTIFICATION_TTL_DAYS } from "../handlers/messages";
import { batchDelete } from "../handlers/_helpers";

const RETENTION_BATCH_LIMIT = 100;
const PROXY_URL_PREFIX = "/media/";

/**
 * Delete a chat attachment's STORAGE OBJECT, then its `mediaAssets` doc.
 *
 * 🛑 Attachments die BEFORE the Firestore conversation document — the same
 * class of defect as the missing TTL that got the feature deleted the first
 * time: `mediaTmpCleanup` only sweeps `tmp/`, so a finalized `media/*` object
 * would survive this prune as a permanent orphan if the document went first
 * and nothing remembered which assets belonged to it.
 */
async function deleteAttachmentByProxyUrl(ctx: JobContext, url: string): Promise<void> {
  if (!url.startsWith(PROXY_URL_PREFIX)) return;
  const shortId = url.slice(PROXY_URL_PREFIX.length);
  if (shortId.includes("/")) return;

  try {
    const asset = await mediaAssetsRepository.findById(shortId);
    if (!asset) return;
    await getAdminStorageLite().bucket().file(asset.storagePath).delete({ ignoreNotFound: true });
    await mediaAssetsRepository.delete(shortId);
  } catch (err) {
    void normalizeError(err);
    ctx.logger.warn("notificationPrune: failed to delete chat attachment (non-fatal)", { url });
  }
}

/**
 * D9 retention, folded into this job per its own "prune user-facing records
 * past retention" charter — query-based with `.limit()`, never a
 * whole-collection snapshot.
 *
 * | Stage | Age since lastMessageAt | Action |
 * |---|---|---|
 * | Active | 0–30d | normal |
 * | Archived | 30d–7mo | hidden from the default inbox, read-only |
 * | Deleted | >7mo | document + subcollection + attachments |
 */
async function runChatRetention(ctx: JobContext): Promise<void> {
  const now = Date.now();
  const archiveCutoff = new Date(now - CONVERSATION_ACTIVE_DAYS * 24 * 60 * 60 * 1000);
  const deleteCutoff = new Date(now - CONVERSATION_ARCHIVE_DAYS * 24 * 60 * 60 * 1000);

  try {
    const toArchive = await conversationsRepository.archiveStale(archiveCutoff, RETENTION_BATCH_LIMIT);
    for (const conv of toArchive) {
      await conversationsRepository.update(conv.id, { status: "archived" });
    }
    if (toArchive.length > 0) {
      ctx.logger.info("Conversations archived", { count: toArchive.length });
    }
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("Chat archive stage failed (non-fatal)", err);
  }

  try {
    const toDelete = await conversationsRepository.findDeletable(deleteCutoff, RETENTION_BATCH_LIMIT);
    for (const conv of toDelete) {
      const attachmentUrls = await listAllAttachmentUrls(conv.id);
      for (const url of attachmentUrls) {
        await deleteAttachmentByProxyUrl(ctx, url);
      }
      await deleteAllMessages(conv.id);
      await conversationsRepository.delete(conv.id);
    }
    if (toDelete.length > 0) {
      ctx.logger.info("Conversations deleted past retention", { count: toDelete.length });
    }
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("Chat delete stage failed (non-fatal)", err);
  }
}

export async function runNotificationPrune(ctx: JobContext): Promise<void> {
  ctx.logger.info(
    `Pruning read notifications older than ${NOTIFICATION_TTL_DAYS} days`,
  );
  const refs = await notificationRepository.getOldReadRefs(NOTIFICATION_TTL_DAYS);
  if (refs.length === 0) {
    ctx.logger.info("No stale read notifications found");
  } else {
    const deleted = await batchDelete(ctx, refs);
    ctx.logger.info("Notification prune complete", { deleted });
  }

  await runChatRetention(ctx);
}
