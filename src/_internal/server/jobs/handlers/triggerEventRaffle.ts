import type { CallableHandler, JobContext } from "../runtime/types";
import {
  runTriggerEventRaffle,
  type TriggerEventRaffleInput,
  type TriggerEventRaffleResult,
} from "../core/triggerEventRaffle";

function httpError(message: string, status: number): Error {
  const err = new Error(message);
  (err as Error & { httpStatus: number }).httpStatus = status;
  return err;
}

export const triggerEventRaffleHandler: CallableHandler<
  TriggerEventRaffleInput,
  TriggerEventRaffleResult
> = async (input: TriggerEventRaffleInput, ctx: JobContext) => {
  const result = await runTriggerEventRaffle(input, ctx);
  if (result.reason === "event_not_found") {
    throw httpError("Event not found", 404);
  }
  if (result.reason === "no_eligible_entries") {
    throw httpError("No eligible entries for raffle", 422);
  }
  return result;
};
