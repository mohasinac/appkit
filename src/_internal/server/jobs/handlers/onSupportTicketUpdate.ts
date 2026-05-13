import type { FirestoreTriggerHandler } from "../runtime/types";
import { handleSupportTicketUpdate } from "../core/onSupportTicketUpdate";

export const onSupportTicketUpdateHandler: FirestoreTriggerHandler<
  Record<string, unknown>,
  Record<string, unknown>
> = async (event, ctx) => {
  await handleSupportTicketUpdate(
    {
      ticketId: event.params.ticketId,
      before: event.before as { status?: string; userId?: string; subject?: string } | null,
      after: event.after as { status?: string; userId?: string; subject?: string } | null,
    },
    ctx,
  );
};
