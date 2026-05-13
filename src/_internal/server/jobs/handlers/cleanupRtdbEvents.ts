import type { ScheduleHandler } from "../runtime/types";
import { runCleanupRtdbEvents } from "../core/cleanupRtdbEvents";

export const cleanupRtdbEventsHandler: ScheduleHandler = runCleanupRtdbEvents;
