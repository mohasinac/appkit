import type { CallableHandler, JobContext } from "../runtime/types";
import {
  runAssignSpinPrize,
  type AssignSpinPrizeInput,
  type AssignSpinPrizeResult,
} from "../core/assignSpinPrize";
import { reasonToHttp } from "../core/event-draw-reasons";

function httpError(message: string, status: number, code: string): Error {
  const err = new Error(message);
  (err as Error & { httpStatus: number; code: string }).httpStatus = status;
  (err as Error & { httpStatus: number; code: string }).code = code;
  return err;
}

/**
 * Statuses come from `reasonToHttp`, shared with `POST /api/events/[id]/spin`.
 *
 * This used to be a hand-written if-chain, and it disagreed with the route it
 * mirrors: `identity_required` was 400 here and 401 there, and there was no
 * `feature_disabled` branch at all, so that reason fell through as a SUCCESS.
 * Two entry points, one handler, two behaviours — Root Cause #85.
 */
export const assignSpinPrizeHandler: CallableHandler<
  AssignSpinPrizeInput,
  AssignSpinPrizeResult
> = async (input: AssignSpinPrizeInput, ctx: JobContext) => {
  const result = await runAssignSpinPrize(input, ctx);
  // Mirrors the route's own success test: a reason with no prize is a refusal.
  if (result.reason && !result.spinPrizeId) {
    const { status, code, message } = reasonToHttp(result.reason);
    throw httpError(message, status, code);
  }
  return result;
};
