import type { ScheduleHandler } from "../runtime/types";
import { runPageViewPrune } from "../core/pageViewPrune";

export const pageViewPruneHandler: ScheduleHandler = runPageViewPrune;
