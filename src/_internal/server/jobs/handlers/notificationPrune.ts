import type { ScheduleHandler } from "../runtime/types";
import { runNotificationPrune } from "../core/notificationPrune";

export const notificationPruneHandler: ScheduleHandler = runNotificationPrune;
