import type { ScheduleHandler } from "../runtime/types";
import { runClearanceExpiryReveal } from "../core/clearanceExpiryReveal";

export const clearanceExpiryRevealHandler: ScheduleHandler = runClearanceExpiryReveal;
