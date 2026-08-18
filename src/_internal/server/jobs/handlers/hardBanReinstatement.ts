import type { ScheduleHandler } from "../runtime/types";
import { runHardBanReinstatement } from "../core/hardBanReinstatement";

export const hardBanReinstatementHandler: ScheduleHandler = runHardBanReinstatement;
