import type { ScheduleHandler } from "../runtime/types";
import { runPaymentReviewAutoApprove } from "../core/paymentReviewAutoApprove";

export const paymentReviewAutoApproveHandler: ScheduleHandler = runPaymentReviewAutoApprove;
