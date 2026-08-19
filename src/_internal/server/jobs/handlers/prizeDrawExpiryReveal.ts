import type { ScheduleHandler } from "../runtime/types";
import { runPrizeDrawExpiryReveal } from "../core/prizeDrawExpiryReveal";

export const prizeDrawExpiryRevealHandler: ScheduleHandler = runPrizeDrawExpiryReveal;
