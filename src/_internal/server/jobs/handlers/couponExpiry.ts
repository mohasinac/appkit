import type { ScheduleHandler } from "../runtime/types";
import { runCouponExpiry } from "../core/couponExpiry";

export const couponExpiryHandler: ScheduleHandler = runCouponExpiry;
