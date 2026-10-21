import type { ScheduleHandler } from "../runtime/types";
import { runPaymentReconcile } from "../core/paymentReconcile";

export const paymentReconcileHandler: ScheduleHandler = runPaymentReconcile;
