import type { ScheduleHandler } from "../runtime/types";
import { runEmiInstallmentReminder } from "../core/emiInstallmentReminder";

export const emiInstallmentReminderHandler: ScheduleHandler = runEmiInstallmentReminder;
