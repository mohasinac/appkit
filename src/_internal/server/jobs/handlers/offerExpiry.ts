import type { ScheduleHandler } from "../runtime/types";
import { runOfferExpiry } from "../core/offerExpiry";

export const offerExpiryHandler: ScheduleHandler = runOfferExpiry;
