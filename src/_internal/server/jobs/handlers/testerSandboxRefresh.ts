import type { ScheduleHandler } from "../runtime/types";
import { runTesterSandboxRefresh } from "../core/testerSandboxRefresh";

export const testerSandboxRefreshHandler: ScheduleHandler = (ctx) => runTesterSandboxRefresh(ctx);
