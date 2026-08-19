import type { ScheduleHandler } from "../runtime/types";
import { runRevenueRollup } from "../core/revenueRollup";

export const revenueRollupHandler: ScheduleHandler = runRevenueRollup;
