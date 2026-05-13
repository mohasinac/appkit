import type { ScheduleHandler } from "../runtime/types";
import { runPrizeRevealClose } from "../core/prizeRevealClose";

export const prizeRevealCloseHandler: ScheduleHandler = runPrizeRevealClose;
