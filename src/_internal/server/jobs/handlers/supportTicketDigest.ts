import type { ScheduleHandler } from "../runtime/types";
import { runSupportTicketDigest } from "../core/supportTicketDigest";

/**
 * ⚠ The result is deliberately discarded. `runSupportTicketDigest` returns a
 * typed `{ sent, reason }` for callers that care, but a scheduled run has
 * nowhere to return it to — and "nothing to report" is a success, not a
 * failure. Throwing on it would mark the function failed every quiet day.
 */
export const supportTicketDigestHandler: ScheduleHandler = async (ctx) => {
  await runSupportTicketDigest(ctx);
};
