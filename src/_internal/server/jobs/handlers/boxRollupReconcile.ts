import type { ScheduleHandler } from "../runtime/types";
import { runBoxRollupReconcile } from "../core/boxRollupReconcile";

/*
 * 🛑 Wrapped rather than assigned directly. `ScheduleHandler` is
 * `(ctx) => Promise<void>` and `runBoxRollupReconcile` resolves to a
 * `BoxRollupReconcileResult`, which is NOT assignable — TypeScript's
 * return-type `void` exemption covers `() => void`, where any return value is
 * discardable, but it does not reach through `Promise<T>` to `Promise<void>`.
 *
 * The result is deliberately still returned by the core function: the
 * scheduler has no use for it, but a manual trigger does, and the job already
 * logs `drifted` itself so nothing is lost by dropping it here.
 */
export const boxRollupReconcileHandler: ScheduleHandler = async (ctx) => {
  await runBoxRollupReconcile(ctx);
};
