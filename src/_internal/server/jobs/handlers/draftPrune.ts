import type { ScheduleHandler } from "../runtime/types";
import { runDraftPrune } from "../core/draftPrune";

export const draftPruneHandler: ScheduleHandler = runDraftPrune;
