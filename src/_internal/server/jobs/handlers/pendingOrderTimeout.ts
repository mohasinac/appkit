import type { ScheduleHandler } from "../runtime/types";
import { runPendingOrderTimeout } from "../core/pendingOrderTimeout";

export const pendingOrderTimeoutHandler: ScheduleHandler = runPendingOrderTimeout;
