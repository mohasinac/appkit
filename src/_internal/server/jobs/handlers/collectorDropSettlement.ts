import type { ScheduleHandler } from "../runtime/types";
import { runCollectorDropSettlement } from "../core/collectorDropSettlement";

export const collectorDropSettlementHandler: ScheduleHandler = runCollectorDropSettlement;
