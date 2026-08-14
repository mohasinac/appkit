import type { ScheduleHandler } from "../runtime/types";
import { runCatalogueImageStalenessReminder } from "../core/catalogueImageStalenessReminder";

export const catalogueImageStalenessReminderHandler: ScheduleHandler = runCatalogueImageStalenessReminder;
