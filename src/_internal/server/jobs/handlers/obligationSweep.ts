import type { ScheduleHandler } from "../runtime/types";
import { runObligationSweep } from "../core/obligationSweep";

/*
 * 🛑 Wrapped rather than assigned directly. `ScheduleHandler` is
 * `(ctx) => Promise<void>` and `runObligationSweep` resolves a RESULT object,
 * which is not assignable: the return-type `void` exemption covers
 * `() => void`, where any return value is discardable, but it does not reach
 * through `Promise<T>` to `Promise<void>`.
 *
 * The result stays on the core function deliberately — the scheduler has no
 * use for it, a manual trigger does, and the job logs its own summary either
 * way. Same shape as `boxRollupReconcileHandler`.
 */
export const obligationSweepHandler: ScheduleHandler = async (ctx) => {
  await runObligationSweep(ctx);
};
