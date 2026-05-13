import type { ScheduleHandler } from "../runtime/types";
import { runCartPrune } from "../core/cartPrune";

export const cartPruneHandler: ScheduleHandler = runCartPrune;
