import { runMarketPriceRollup } from "../core/marketPriceRollup";
import type { ScheduleHandler } from "../runtime/types";

export const marketPriceRollupHandler: ScheduleHandler = runMarketPriceRollup;
