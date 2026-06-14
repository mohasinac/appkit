import { normalizeError } from "../../../../errors/normalize";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import type { JobContext } from "../runtime/types";

export interface HandleSupportTicketUpdateInput {
  ticketId: string;
  before: { status?: string; userId?: string; subject?: string } | null;
  after: { status?: string; userId?: string; subject?: string } | null;
}

const USER_NOTIFY_STATUSES = new Set(["resolved", "closed", "waiting_on_user", "in_progress"]);

const STATUS_MESSAGES: Record<string, { title: string; body: (subject: string) => string }> = {
  resolved: {
    title: "Support ticket resolved",
    body: (subject) => `Your support ticket "${subject}" has been marked as resolved.`,
  },
  closed: {
    title: "Support ticket closed",
    body: (subject) => `Your support ticket "${subject}" has been closed.`,
  },
  waiting_on_user: {
    title: "Response required on your ticket",
    body: (subject) => `Your support ticket "${subject}" is waiting for your reply.`,
  },
  in_progress: {
    title: "Support ticket in progress",
    body: (subject) => `Your support ticket "${subject}" is being reviewed by our team.`,
  },
};

export async function handleSupportTicketUpdate(
  input: HandleSupportTicketUpdateInput,
  ctx: JobContext,
): Promise<void> {
  const { ticketId, before, after } = input;

  const prevStatus = before?.status;
  const nextStatus = after?.status;
  const userId = after?.userId ?? before?.userId;
  const subject = after?.subject ?? before?.subject ?? "your ticket";

  if (!nextStatus || !userId || prevStatus === nextStatus) return;
  if (!USER_NOTIFY_STATUSES.has(nextStatus)) return;

  const msg = STATUS_MESSAGES[nextStatus];
  if (!msg) return;

  try {
    await sendNotification({
      userId,
      type: "account_action",
      priority: "normal",
      title: msg.title,
      message: msg.body(subject),
      relatedId: ticketId,
      relatedType: "support_ticket",
    });
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("Failed to notify user of ticket status change (non-fatal)", err, { ticketId, userId, nextStatus });
  }

  ctx.logger.info("onSupportTicketUpdate complete", { ticketId, userId, prevStatus, nextStatus });
}
