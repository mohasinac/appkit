import { runAnalyticsAlertEvaluate } from "../core/analyticsAlertEvaluate";
import type { ScheduleHandler } from "../runtime/types";

export const analyticsAlertEvaluateHandler: ScheduleHandler = runAnalyticsAlertEvaluate;
