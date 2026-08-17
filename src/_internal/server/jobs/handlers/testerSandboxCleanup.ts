import type { ScheduleHandler } from "../runtime/types";
import { runTesterSandboxCleanup } from "../core/testerSandboxCleanup";

export const testerSandboxCleanupHandler: ScheduleHandler = (ctx) => runTesterSandboxCleanup(ctx);
