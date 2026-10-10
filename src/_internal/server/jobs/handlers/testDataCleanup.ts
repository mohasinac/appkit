import type { ScheduleHandler } from "../runtime/types";
import { runTestDataCleanup } from "../core/testDataCleanup";

export const testDataCleanupHandler: ScheduleHandler = (ctx) => runTestDataCleanup(ctx);
