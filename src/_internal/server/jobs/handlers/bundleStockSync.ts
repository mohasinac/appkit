import type { ScheduleHandler } from "../runtime/types";
import { runBundleStockSync } from "../core/bundleStockSync";

export const bundleStockSyncHandler: ScheduleHandler = runBundleStockSync;
