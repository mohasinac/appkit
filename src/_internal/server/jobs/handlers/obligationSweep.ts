import type { ScheduleHandler } from "../runtime/types";
import { runObligationSweep } from "../core/obligationSweep";

export const obligationSweepHandler: ScheduleHandler = runObligationSweep;
