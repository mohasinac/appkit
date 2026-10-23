import type { JobContext } from "../runtime/types";
import { expireDueReservations } from "../../features/inventory/reservations";
import { normalizeError } from "../../../../errors/normalize";

/**
 * Return expired stock holds to the shelf.
 *
 * 🛑 This sweep is the ONLY thing that bounds a leaked hold. Everything else
 * that ends a reservation is an action somebody takes — a release, a
 * consume — and the entire reason `expiresAt` exists is that nobody takes
 * those when they close the tab. Without this job a hold is permanent, and a
 * permanent hold is indistinguishable from stock the seller no longer has.
 *
 * 🛑 Runs every 15 minutes, which is the real resolution of a TTL. The
 * default hold is 72 hours, so the cadence does not need to be tight — but a
 * daily sweep would make the worst case "expires at 09:01, returns tomorrow",
 * and a buyer told an item is sold out for 24 hours after it stopped being
 * held is the failure this exists to prevent.
 */
export async function runReservationExpiry(ctx: JobContext): Promise<void> {
  ctx.logger.info("Starting stock-reservation expiry sweep");

  let result;
  try {
    result = await expireDueReservations();
  } catch (err) {
    const normalized = normalizeError(err);
    ctx.logger.error("Reservation expiry sweep failed", { message: normalized.message });
    throw err;
  }

  /*
   * `truncated` is logged rather than swallowed, and is the signal that the
   * bound was reached: a run that hits its cap left real holds in place, and
   * reading "expired 200" as "all done" is the same mistake a truncated
   * recount invites (Root Cause #102).
   */
  ctx.logger.info("Reservation expiry sweep complete", {
    scanned: result.scanned,
    expired: result.expired,
    truncated: result.truncated,
  });
}
