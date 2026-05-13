import type { ScheduleHandler } from "../runtime/types";
import { runAutoPayoutEligibility } from "../core/autoPayoutEligibility";

export const autoPayoutEligibilityHandler: ScheduleHandler = runAutoPayoutEligibility;
