import type { CallableHandler, JobContext } from "../runtime/types";
import {
  runTriggerEventRaffle,
  type TriggerEventRaffleInput,
  type TriggerEventRaffleResult,
} from "../core/triggerEventRaffle";
import { reasonToHttp } from "../core/event-draw-reasons";

function httpError(message: string, status: number, code: string): Error {
  const err = new Error(message);
  (err as Error & { httpStatus: number; code: string }).httpStatus = status;
  (err as Error & { httpStatus: number; code: string }).code = code;
  return err;
}

/**
 * Statuses come from `reasonToHttp`, shared with
 * `POST /api/admin/events/[id]/trigger-raffle`.
 *
 * The hand-written chain this replaces knew two reasons (404 / 422) while the
 * route mapped everything to 409 — so the same refusal had two different
 * statuses depending on which door it came through (Root Cause #85).
 */
export const triggerEventRaffleHandler: CallableHandler<
  TriggerEventRaffleInput,
  TriggerEventRaffleResult
> = async (input: TriggerEventRaffleInput, ctx: JobContext) => {
  const result = await runTriggerEventRaffle(input, ctx);
  // Mirrors the route's own success test: a reason with no winner is a refusal.
  if (result.reason && !result.raffleWinnerUserId) {
    const { status, code, message } = reasonToHttp(result.reason);
    throw httpError(message, status, code);
  }
  return result;
};
