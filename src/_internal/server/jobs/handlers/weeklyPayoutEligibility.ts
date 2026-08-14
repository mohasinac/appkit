import type { ScheduleHandler } from "../runtime/types";
import { runWeeklyPayoutEligibility } from "../core/weeklyPayoutEligibility";

export const weeklyPayoutEligibilityHandler: ScheduleHandler = async (ctx) => {
  await runWeeklyPayoutEligibility(ctx);
};
