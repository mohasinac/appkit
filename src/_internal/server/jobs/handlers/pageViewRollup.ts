import type { ScheduleHandler } from "../runtime/types";
import { runPageViewRollup } from "../core/pageViewRollup";
import { runProductViewWindows } from "../core/productViewWindows";

/**
 * Two passes over `pageViews`, in one scheduled function.
 *
 * 🛑 One function because the Firebase budget row prices each registered
 * Cloud Scheduler job at ~$0.10/month and says to fold new periodic work into
 * an existing cadence where it is a natural fit. These two read the same
 * collection on the same night, so it is.
 *
 * 🛑 But they are two CORES, not one, because their read shapes are opposites:
 * the rollup ACCUMULATES (it must only see buckets it has not folded, or its
 * total walks backwards as the prune catches up) while the windows RECOMPUTE
 * (yesterday's 30-day window is not today's). Sharing a read would break
 * `throughDate`, which is the only thing making the rollup re-runnable.
 *
 * 🛑 Sequential, and the rollup goes FIRST. It is the one whose failure loses
 * data permanently — a bad read there advances `throughDate` past days it never
 * counted. The windows are a pure recompute and tomorrow's run fixes any miss,
 * so they are the half that can safely be second. `Promise.all` would let a
 * windows failure mask a rollup failure in the same rejection.
 */
export const pageViewRollupHandler: ScheduleHandler = async (ctx) => {
  await runPageViewRollup(ctx);
  await runProductViewWindows(ctx);
};
