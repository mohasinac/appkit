import type { ScheduleHandler } from "../runtime/types";
import { runDailyDataCleanup } from "../core/dailyDataCleanup";

export const dailyDataCleanupHandler: ScheduleHandler = runDailyDataCleanup;
