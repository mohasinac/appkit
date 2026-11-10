/**
 * Daily support-ticket roll-up to the business WhatsApp number.
 *
 * Owner, 2026-11-10: money-flow tickets message immediately; *"rest can be
 * [a] normal daily hook cron on firebase function to give an update to the
 * main business account number."*
 *
 * So this is the OTHER half of `onSupportTicketCreate`'s split. Money
 * categories escalate per-ticket as an `adminNotifications` row the moment
 * they arrive; everything else accumulates and is summarised here once a day.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 🛑 WHY A DIGEST RATHER THAN PER-TICKET ALERTS
 * ────────────────────────────────────────────────────────────────────────────
 *
 * A per-ticket WhatsApp blast already existed once on the order path and was
 * deliberately removed: one message per event, bypassing every preference,
 * with no way to mark it read. At ticket volume it is worse — the useful
 * signal (a refund dispute) drowns in the noise (password questions), which
 * is exactly the failure the money/non-money split exists to prevent.
 *
 * ⚠ This reports COUNTS and categories, never ticket bodies. A support ticket
 * carries customer names, emails and order details (`SUPPORT_TICKET_PII_FIELDS`),
 * and a WhatsApp message is not a place to accumulate any of that. Whoever
 * reads the digest opens the dashboard for specifics.
 */

import { normalizeError } from "../../../../errors/normalize";
import { safeRead } from "../../../../errors/safe-read";
import { siteSettingsRepository } from "../../../../features/admin/repository/site-settings.repository";
import { supportRepository } from "../../../../features/support/repository/support.repository";
import { DEFAULT_MONEY_TICKET_CATEGORIES } from "../../../../features/support/schemas/firestore";
import {
  sendWhatsAppTemplateMessage,
  sendWhatsAppBusinessMessage,
} from "../../../../features/whatsapp-bot/helpers/whatsapp";
import { guardSend, logSuppressedSend } from "../../notifications/send-guard";
import type { JobContext } from "../runtime/types";

export interface SupportTicketDigestResult {
  sent: boolean;
  reason?: "no_recipients" | "nothing_to_report" | "not_configured" | "suppressed" | "send_failed";
  openCount?: number;
}

/**
 * Summarise the non-money tickets still open and message the business number.
 *
 * Returns a typed result rather than throwing, matching `runDailyStatusDigest`
 * — a digest that cannot send is a reportable state, not an incident, and a
 * throw here would mark the scheduled function failed for something routine
 * like "no tickets today".
 */
export async function runSupportTicketDigest(
  ctx: JobContext,
): Promise<SupportTicketDigestResult> {
  const settings = await safeRead(() => siteSettingsRepository.getSingleton(), {
    route: "jobs/supportTicketDigest",
    key: "supportTicketDigest.settings",
    fallback: null,
  });

  const creds = settings?.credentials ?? {};
  /*
   * Same resolution order as every other send: the chosen sender first (it is
   * an operator choice, not a secret), then the deployment's env, then the
   * stored credential.
   */
  const phoneNumberId =
    creds.whatsappSenderPhoneNumberId?.trim() ||
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ||
    (creds.whatsappPhoneNumberId?.trim() ?? "");
  const accessToken =
    process.env.WHATSAPP_MESSAGES_TOKEN?.trim() ||
    (creds.whatsappCloudApiToken?.trim() ?? "");

  if (!phoneNumberId || !accessToken) {
    ctx.logger.info("Support digest: WhatsApp not configured — skipping");
    return { sent: false, reason: "not_configured" };
  }

  /*
   * 🛑 `whatsappAdminNotifyNumbers`, NOT `contact.whatsappNumber`. The latter
   * is the buyer-facing number and is withheld from the public payload unless
   * published; this digest goes to whoever runs the business, which is a
   * different list with a different privacy meaning.
   */
  const recipients = (creds.whatsappAdminNotifyNumbers ?? "")
    .split(",")
    .map((n) => n.replace(/\D/g, ""))
    .filter(Boolean);

  if (recipients.length === 0) {
    ctx.logger.info("Support digest: no admin notify numbers configured — skipping");
    return { sent: false, reason: "no_recipients" };
  }

  // `??` not `||`: an empty array means "nothing is urgent", and must not be
  // silently replaced by the defaults.
  const moneyCategories = settings?.supportMoneyCategories ?? DEFAULT_MONEY_TICKET_CATEGORIES;

  let open: Array<{ category?: string }> = [];
  try {
    open = await supportRepository.listOpenForDigest();
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("Support digest: could not read open tickets", err);
    return { sent: false, reason: "send_failed" };
  }

  /*
   * Money tickets are excluded on purpose: they were already escalated
   * individually when they arrived. Repeating them here would train whoever
   * reads this to treat the urgent rows as routine.
   */
  const nonMoney = open.filter((t) => !t.category || !moneyCategories.includes(t.category));

  if (nonMoney.length === 0) {
    ctx.logger.info("Support digest: nothing to report");
    return { sent: false, reason: "nothing_to_report", openCount: 0 };
  }

  const byCategory = new Map<string, number>();
  for (const t of nonMoney) {
    const key = t.category ?? "uncategorised";
    byCategory.set(key, (byCategory.get(key) ?? 0) + 1);
  }
  /*
   * 🛑 Single line, " · " separated. A WhatsApp TEMPLATE parameter rejects
   * newlines, tabs and 4+ consecutive spaces (Meta error 132018, measured),
   * so a digest formatted the obvious way fails at send time rather than at
   * approval.
   */
  const breakdown = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat, n]) => `${cat} ${n}`)
    .join(" · ");

  const guard = {
    channel: "whatsapp" as const,
    feature: "support_ticket_digest",
    // "staff", not "user": this is an operator report, so the buyer-facing
    // kill switch should not silence it.
    audience: "staff" as const,
  };
  const decision = await guardSend(guard);
  if (!decision.allow) {
    logSuppressedSend(guard, decision);
    return { sent: false, reason: "suppressed", openCount: nonMoney.length };
  }

  const templateName = creds.whatsappTemplateOrderUpdate?.trim() ?? "";
  const languageCode = creds.whatsappTemplateLanguage?.trim() || "en";
  const summary = `${nonMoney.length} open support ticket(s): ${breakdown}`;

  let sentAny = false;
  for (const to of recipients) {
    try {
      /*
       * ⚠ A digest to STAFF is the one case where a free-form send is
       * legitimate: an operator who has messaged the business number is
       * inside the 24h window, and there is no approved digest template. If
       * neither works the digest is skipped, never faked — a "sent" log for a
       * message nobody received is worse than silence.
       */
      const ok = templateName
        ? await sendWhatsAppTemplateMessage({
            toPhone: to,
            phoneNumberId,
            accessToken,
            templateName,
            languageCode,
            bodyParams: ["Team", "support", summary, "Open", "n/a", breakdown],
          })
        : await sendWhatsAppBusinessMessage({
            toPhone: to,
            phoneNumberId,
            accessToken,
            message: summary,
          });
      sentAny = sentAny || ok;
    } catch (err) {
      void normalizeError(err);
      ctx.logger.error("Support digest: send failed for one recipient (non-fatal)", err);
    }
  }

  ctx.logger.info("Support digest complete", {
    open: nonMoney.length,
    recipients: recipients.length,
    sentAny,
  });
  return sentAny
    ? { sent: true, openCount: nonMoney.length }
    : { sent: false, reason: "send_failed", openCount: nonMoney.length };
}
