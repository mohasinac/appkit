import type { FirestoreTriggerHandler } from "../runtime/types";
import type { JsonValue } from "../../../../schemas/types";
import { handleSupportTicketCreate } from "../core/onSupportTicketCreate";

export const onSupportTicketCreateHandler: FirestoreTriggerHandler<
  null,
  Record<string, JsonValue>
> = async (event, ctx) => {
  const ticket = event.after;
  if (!ticket) return;
  await handleSupportTicketCreate({ ticketId: event.params.ticketId, ticket }, ctx);
};
