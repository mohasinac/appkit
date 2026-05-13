import type { ScheduleHandler } from "../runtime/types";
import { runPrizeRevealReminder } from "../core/prizeRevealReminder";

export const prizeRevealReminderHandler: ScheduleHandler = runPrizeRevealReminder;
