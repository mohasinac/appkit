import type { ScheduleHandler } from "../runtime/types";
import { runSellerStandingRollup } from "../core/sellerStandingRollup";

/**
 * 🛑 No `force`. The schedule fires on days 28–31 and the core's month-end
 * guard keeps exactly the real last day — see `isLastDayOfMonth` for why the
 * cron cannot simply say "31".
 *
 * `ScheduleHandler` returns `void`, so the result object is dropped here. It
 * is not lost: the core logs `granted`/`revoked`/`locked` counts, and it is
 * returned for the admin recompute path and for verification, which call the
 * core directly with `{ force: true }`.
 */
export const sellerStandingRollupHandler: ScheduleHandler = async (ctx) => {
  await runSellerStandingRollup(ctx);
};
