import type { ScheduleHandler } from "../runtime/types";
import { runPaymentWindowTimeout } from "../core/paymentWindowTimeout";

export const paymentWindowTimeoutHandler: ScheduleHandler = runPaymentWindowTimeout;
