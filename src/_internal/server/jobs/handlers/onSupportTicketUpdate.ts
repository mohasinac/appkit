import type { FirestoreTriggerHandler } from "../runtime/types";
import type { JsonValue } from "@mohasinac/appkit";
import { handleSupportTicketUpdate } from "../core/onSupportTicketUpdate";

export const onSupportTicketUpdateHandler: FirestoreTriggerHandler<
  Record<string, JsonValue>,
  Record<string, JsonValue>
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
