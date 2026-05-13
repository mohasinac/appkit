import type { ScheduleHandler } from "../runtime/types";
import { runPrizeRevealExpiry } from "../core/prizeRevealExpiry";

export const prizeRevealExpiryHandler: ScheduleHandler = runPrizeRevealExpiry;
