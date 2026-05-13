import type { ScheduleHandler } from "../runtime/types";
import { runCountersReconcile } from "../core/countersReconcile";

export const countersReconcileHandler: ScheduleHandler = runCountersReconcile;
