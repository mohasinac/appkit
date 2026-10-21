import type { ScheduleHandler } from "../runtime/types";
import { runBoxRollupReconcile } from "../core/boxRollupReconcile";

export const boxRollupReconcileHandler: ScheduleHandler = runBoxRollupReconcile;
