import { notificationRepository, supportRepository } from "../../../../repositories";
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

  // Confirm to the user their ticket was received
  try {
    await notificationRepository.create({
      userId,
      type: "account_action",
      title: "Support ticket received",
      body: `We received your support request: "${ticket.subject ?? "your ticket"}". We'll get back to you soon.`,
      isRead: false,
      entityId: ticketId,
      entityType: "support_ticket",
      createdAt: new Date(),
    } as any);
  } catch (err) {
    ctx.logger.error("Failed to send ticket confirmation notification (non-fatal)", err, { ticketId, userId });
  }

  ctx.logger.info("onSupportTicketCreate complete", { ticketId, userId });
}
