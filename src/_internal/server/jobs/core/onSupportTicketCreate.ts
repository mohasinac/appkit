import { sendNotification } from "../../../../features/admin/actions/notification-actions";
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
      type: "account_action",
      priority: "normal",
      title: "Support ticket received",
      message: `We received your support request: "${ticket.subject ?? "your ticket"}". We'll get back to you soon.`,
      relatedId: ticketId,
      relatedType: "support_ticket",
    });
  } catch (err) {
    ctx.logger.error("Failed to send ticket confirmation notification (non-fatal)", err, { ticketId, userId });
  }

  ctx.logger.info("onSupportTicketCreate complete", { ticketId, userId });
}
