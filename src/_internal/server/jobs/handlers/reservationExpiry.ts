import type { ScheduleHandler } from "../runtime/types";
import { runReservationExpiry } from "../core/reservationExpiry";

export const reservationExpiryHandler: ScheduleHandler = runReservationExpiry;
