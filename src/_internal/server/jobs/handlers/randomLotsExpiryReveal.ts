import type { ScheduleHandler } from "../runtime/types";
import { runRandomLotsExpiryReveal } from "../core/randomLotsExpiryReveal";

export const randomLotsExpiryRevealHandler: ScheduleHandler = runRandomLotsExpiryReveal;
