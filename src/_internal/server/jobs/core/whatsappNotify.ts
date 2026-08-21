/**
 * Core: async WhatsApp notification dispatch (`whatsappNotify` job).
 *
 * `sendNotification()` (appkit/src/features/admin/actions/notification-actions.ts)
 * no longer calls the Meta Cloud API synchronously in-request — it enqueues
 * this job instead (CLAUDE.md Rule #6 async job primitive) and returns
 * immediately. This runner does the actual send, with a bounded retry, and
 * writes the outcome back onto `notifications/{notificationId}` so admins
 * have visibility beyond the `jobs/{jobId}` doc itself.
 *
 * Retry note: `sendWhatsAppTemplateMessage`/`sendWhatsAppBusinessMessage`
 * return a plain boolean (not a status code), so this runner cannot cleanly
 * distinguish a transient 5xx from a terminal 4xx (bad token, unknown
 * template) the way a status-code-aware client could. It retries any
 * failure up to MAX_ATTEMPTS with a short backoff — an acceptable
 * simplification since this runs off the critical path, well inside the
 * Firebase Function's 300s budget, and a terminal error just burns two
 * extra fast failures before giving up.
 */

import { normalizeError } from "../../../../errors/normalize";
import { notificationRepository } from "../../../../features/admin/repository/notification.repository";
import {
  sendWhatsAppTemplateMessage,
  sendWhatsAppBusinessMessage,
} from "../../../../features/whatsapp-bot/helpers/whatsapp";
import { isChannelHealthy, recordChannelOutcome } from "../../notifications/channel-health";
import type { JobContext } from "../runtime/types";
import type { JobRunResult } from "./jobRunners";

export interface WhatsAppNotifyPayload {
  toPhone: string;
  title: string;
  message: string;
  type: string;
  /** Approved Meta template name for this notification type, if configured. */
  templateName?: string;
  /** BCP-47 language code the template was approved in. Defaults to "en". */
  templateLanguage?: string;
  notificationId: string;
  phoneNumberId: string;
  accessToken: string;
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runWhatsAppNotify(
  payload: WhatsAppNotifyPayload,
  ctx: JobContext,
): Promise<JobRunResult> {
  const { toPhone, title, message, templateName, templateLanguage, notificationId, phoneNumberId, accessToken } = payload;

  if (!(await isChannelHealthy("whatsapp"))) {
    ctx.logger.warn("whatsappNotify: WhatsApp channel circuit is open — skipping send", { notificationId });
    await notificationRepository
      .update(notificationId, { whatsappStatus: "skipped" } as never)
      .catch((err: unknown) => {
        void normalizeError(err);
      });
    return {
      summary: { total: 1, succeeded: 0, skipped: 1, failed: 0 },
      succeeded: [],
      skipped: [notificationId],
      failed: [],
    };
  }

  let sent = false;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !sent; attempt++) {
    try {
      sent = templateName
        ? await sendWhatsAppTemplateMessage({
            toPhone,
            phoneNumberId,
            accessToken,
            templateName,
            languageCode: templateLanguage ?? "en",
            bodyParams: [title, message],
          })
        : await sendWhatsAppBusinessMessage({
            toPhone,
            phoneNumberId,
            accessToken,
            message: `*${title}*\n${message}`,
          });
      if (!sent) lastError = "Meta WhatsApp API returned a non-OK response";
    } catch (err) {
      void normalizeError(err);
      lastError = err instanceof Error ? err.message : String(err);
    }
    if (!sent && attempt < MAX_ATTEMPTS) {
      ctx.logger.warn("whatsappNotify: send attempt failed, retrying", { notificationId, attempt, error: lastError ?? "" });
      await delay(RETRY_DELAY_MS * attempt);
    }
  }

  if (!templateName) {
    ctx.logger.warn("whatsappNotify: no approved template configured for this notification type — sent as free-form text, which Meta rejects outside the 24h customer-service window", { notificationId });
  }

  await recordChannelOutcome("whatsapp", sent);

  await notificationRepository
    .update(notificationId, { whatsappStatus: sent ? "sent" : "failed" } as never)
    .catch((err: unknown) => {
      void normalizeError(err);
      ctx.logger.warn("whatsappNotify: failed to write back whatsappStatus onto notification doc", {
        notificationId,
        error: err instanceof Error ? err.message : String(err),
      });
    });

  if (!sent) {
    throw new Error(lastError ?? "WhatsApp send failed after retries");
  }

  return {
    summary: { total: 1, succeeded: 1, skipped: 0, failed: 0 },
    succeeded: [notificationId],
    skipped: [],
    failed: [],
  };
}
