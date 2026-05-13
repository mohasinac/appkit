import type { ScheduleHandler } from "../runtime/types";
import { runPositionsReconcile } from "../core/positionsReconcile";

export const positionsReconcileHandler: ScheduleHandler = runPositionsReconcile;
