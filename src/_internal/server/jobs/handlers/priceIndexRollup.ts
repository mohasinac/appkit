import { runPriceIndexRollup } from "../core/priceIndexRollup";
import type { ScheduleHandler } from "../runtime/types";

export const priceIndexRollupHandler: ScheduleHandler = runPriceIndexRollup;
