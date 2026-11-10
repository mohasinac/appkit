import { normalizeError } from "../../../../errors/normalize";
import { safeRead } from "../../../../errors/safe-read";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { siteSettingsRepository } from "../../../../features/admin/repository/site-settings.repository";
import { adminNotificationsRepository } from "../../../../features/store-extensions/repository/rbac.repositories";
import { DEFAULT_MONEY_TICKET_CATEGORIES } from "../../../../features/support/schemas/firestore";
import type { JobContext } from "../runtime/types";

export interface HandleSupportTicketCreateInput {
  ticketId: string;
  ticket: {
    userId?: string;
    subject?: string;
    category?: string;
  };
}

export async function handleSupportTicketCreate(
  input: HandleSupportTicketCreateInput,
  ctx: JobContext,
): Promise<void> {
  const { ticketId, ticket } = input;
  const userId = ticket.userId;

  if (!userId) {
    ctx.logger.warn("onSupportTicketCreate: no userId on ticket", { ticketId });
    return;
  }

  try {
    await sendNotification({
      userId,
      type: "support_ticket_update",
      priority: "normal",
      title: "Support ticket received",
      message: `We received your support request: "${ticket.subject ?? "your ticket"}". We'll get back to you soon.`,
      relatedId: ticketId,
      relatedType: "support_ticket",
    });
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("Failed to send ticket confirmation notification (non-fatal)", err, { ticketId, userId });
  }

  /*
   * ── STAFF SIDE: money now, everything else in the daily roll-up ─────────
   *
   * Owner, 2026-11-10: *"especially money flows which are important, rest can
   * be [a] normal daily hook cron."*
   *
   * Before this, staff got NOTHING per ticket — the only staff-facing signal
   * was the daily digest, so a refund dispute and a "how do I change my
   * password" question travelled at the same speed. `grievance` is the worst
   * case: it carries a statutory clock, so a missed one is a compliance
   * failure rather than a slow reply.
   *
   * 🛑 An `adminNotifications` row, not a WhatsApp blast to admin numbers.
   * That blast already existed once on the order path and was removed: it is
   * one message per admin per event, it bypasses every preference, and it
   * cannot be marked read. A durable row is readable by whoever is actually
   * on duty.
   *
   * ⚠ Non-fatal and last: a failure here must not lose the buyer's own
   * confirmation, which has already been sent above.
   */
  try {
    const settings = await safeRead(() => siteSettingsRepository.getSingleton(), {
      route: "jobs/onSupportTicketCreate",
      key: "supportTicket.moneyCategories",
      fallback: null,
    });
    /*
     * 🛑 `??`, not `||`. An operator who sets an EMPTY array means "nothing is
     * urgent" and must get that; `||` would silently restore the defaults and
     * quietly overrule them.
     */
    const moneyCategories =
      settings?.supportMoneyCategories ?? DEFAULT_MONEY_TICKET_CATEGORIES;

    if (ticket.category && moneyCategories.includes(ticket.category)) {
      await adminNotificationsRepository.create({
        category: "payouts",
        severity: "warning",
        title: `Money-flow support ticket: ${ticket.category}`,
        body: `"${ticket.subject ?? "(no subject)"}" — needs a human now, not in the daily digest.`,
        entityType: "support_ticket",
        entityId: ticketId,
        audienceUserIds: [],
      } as never);
      ctx.logger.info("Money-flow ticket escalated to staff immediately", {
        ticketId,
        category: ticket.category,
      });
    }
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("Failed to escalate money-flow ticket (non-fatal)", err, { ticketId });
  }

  ctx.logger.info("onSupportTicketCreate complete", { ticketId, userId });
}
