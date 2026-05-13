import type { FirestoreTriggerHandler } from "../runtime/types";
import { handleSupportTicketCreate } from "../core/onSupportTicketCreate";

export const onSupportTicketCreateHandler: FirestoreTriggerHandler<
  null,
  Record<string, unknown>
> = async (event, ctx) => {
  const ticket = event.after;
  if (!ticket) return;
  await handleSupportTicketCreate({ ticketId: event.params.ticketId, ticket }, ctx);
};
