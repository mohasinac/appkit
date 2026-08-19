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
  if (result.reason === "identity_required") {
    throw httpError("No user or guest identity provided", 400);
  }
  if (result.reason === "login_required") {
    throw httpError("You must be logged in to spin this wheel", 401);
  }
  if (result.reason === "outside_spin_window") {
    throw httpError("This spin wheel is not open right now", 403);
  }
  if (result.reason === "no_prizes_configured") {
    throw httpError("No spin prizes configured for this event", 422);
  }
  return result;
};
