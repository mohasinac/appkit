import type { ScheduleHandler } from "../runtime/types";
import { runMediaTmpCleanup } from "../core/mediaTmpCleanup";

export const mediaTmpCleanupHandler: ScheduleHandler = runMediaTmpCleanup;
