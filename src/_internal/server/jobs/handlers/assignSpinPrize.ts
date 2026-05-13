import type { CallableHandler } from "../runtime/types";
import {
  runAssignSpinPrize,
  type AssignSpinPrizeInput,
  type AssignSpinPrizeResult,
} from "../core/assignSpinPrize";

export const assignSpinPrizeHandler: CallableHandler<
  AssignSpinPrizeInput,
  AssignSpinPrizeResult
> = runAssignSpinPrize;
