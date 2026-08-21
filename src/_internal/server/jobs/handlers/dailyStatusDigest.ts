import type { ScheduleHandler } from "../runtime/types";
import { runDailyStatusDigest } from "../core/dailyStatusDigest";

export const dailyStatusDigestHandler: ScheduleHandler = async (ctx) => {
  await runDailyStatusDigest(ctx);
};
