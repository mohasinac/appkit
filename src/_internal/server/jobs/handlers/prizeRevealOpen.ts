import type { ScheduleHandler } from "../runtime/types";
import { runPrizeRevealOpen } from "../core/prizeRevealOpen";

export const prizeRevealOpenHandler: ScheduleHandler = runPrizeRevealOpen;
