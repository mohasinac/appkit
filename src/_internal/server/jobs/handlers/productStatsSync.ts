import type { ScheduleHandler } from "../runtime/types";
import { runProductStatsSync } from "../core/productStatsSync";

export const productStatsSyncHandler: ScheduleHandler = runProductStatsSync;
