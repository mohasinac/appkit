import type { CallableHandler, JobContext } from "../runtime/types";
import {
  runAssignSpinPrize,
  type AssignSpinPrizeInput,
  type AssignSpinPrizeResult,
} from "../core/assignSpinPrize";

function httpError(message: string, status: number): Error {
  const err = new Error(message);
  (err as Error & { httpStatus: number }).httpStatus = status;
  return err;
}

export const assignSpinPrizeHandler: CallableHandler<
  AssignSpinPrizeInput,
  AssignSpinPrizeResult
> = async (input: AssignSpinPrizeInput, ctx: JobContext) => {
  const result = await runAssignSpinPrize(input, ctx);
  if (result.reason === "event_not_found") {
    throw httpError("Event not found", 404);
  }
  if (result.reason === "entry_not_found") {
    throw httpError("No event entry found for this user", 404);
  }
  if (result.reason === "no_prizes_configured") {
    throw httpError("No spin prizes configured for this event", 422);
  }
  return result;
};
