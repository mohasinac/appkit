import type { ScheduleHandler } from "../runtime/types";
import { runPageViewRollup } from "../core/pageViewRollup";

export const pageViewRollupHandler: ScheduleHandler = runPageViewRollup;
