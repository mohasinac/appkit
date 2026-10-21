import type { ScheduleHandler } from "../runtime/types";
import { runPaymentReconcile } from "../core/paymentReconcile";

/* Wrapped for the same reason as `obligationSweepHandler` — see the note
 * there: a `Promise<Result>` is not assignable to a `Promise<void>` handler. */
export const paymentReconcileHandler: ScheduleHandler = async (ctx) => {
  await runPaymentReconcile(ctx);
};
