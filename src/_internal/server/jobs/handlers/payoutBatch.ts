import type { ScheduleHandler } from "../runtime/types";
import { runPayoutBatch } from "../core/payoutBatch";

export const payoutBatchHandler: ScheduleHandler = runPayoutBatch;
