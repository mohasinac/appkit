import { sessionRepository, tokenRepository } from "../../../../repositories";
import { gatewayEventsRepository } from "../../../../features/gateway-events/repository/gateway-events.repository";
import { pointsRepository } from "../../../../features/points/repository/points.repository";
import { normalizeError } from "../../../../errors/normalize";
import type { JobContext } from "../runtime/types";
import { batchDelete } from "../handlers/_helpers";

export async function runDailyDataCleanup(ctx: JobContext): Promise<void> {
  ctx.logger.info("Starting daily data cleanup (sessions + tokens + gateway events)");

  const sessionRefs = await sessionRepository.getExpiredRefs(ctx.now);
  const sessionsDeleted = await batchDelete(ctx, sessionRefs);
  ctx.logger.info("Session cleanup complete", { deleted: sessionsDeleted });

  const emailRefs = await tokenRepository.getExpiredEmailVerificationRefs(ctx.now);
  const emailDeleted = await batchDelete(ctx, emailRefs);

  const pwRefs = await tokenRepository.getExpiredPasswordResetRefs(ctx.now);
  const pwDeleted = await batchDelete(ctx, pwRefs);

  ctx.logger.info("Token cleanup complete", {
    emailVerificationDeleted: emailDeleted,
    passwordResetDeleted: pwDeleted,
  });

  /*
   * ── gatewayEvents retention, 90 days ──────────────────────────────────────
   *
   * Folded in here rather than given its own scheduled function, deliberately:
   * Cloud Scheduler bills **per registered job** (3 free, 28 already
   * registered), so a new job for one `where(expiresAt <).limit(500)` query is
   * ~$0.10/month for work that fits in a slot that already runs daily and
   * already does exactly this shape for sessions and tokens.
   *
   * 🛑 Bounded at 500 per run, which is `getExpiredRefs`' own limit. At the
   * expected ~100 events/day that is five days of backlog capacity, so the
   * bound can only bite after a sustained ingest spike — and in that case the
   * right response is to look at why, not to widen a sweep until it times out.
   * The count is logged for exactly that reason.
   *
   * 🛑 It does NOT exclude rows referenced by an open `paymentCases` row yet —
   * Phase 3 builds that collection and this is where the exclusion goes. Until
   * then nothing references a gateway event, so there is nothing to protect;
   * leaving a TODO-shaped comment here instead of a filter is honest, and the
   * retention window (90d) is longer than any case should stay open.
   */
  const eventRefs = await gatewayEventsRepository().getExpiredRefs(ctx.now);
  const eventsDeleted = await batchDelete(ctx, eventRefs);
  ctx.logger.info("Gateway event cleanup complete", {
    deleted: eventsDeleted,
    hitLimit: eventRefs.length === 500,
  });

  /*
   * ── Points expiry (Phase P, decision 4) ─────────────────────────────────
   *
   * Folded into THIS job rather than registered as its own, which is the same
   * reasoning the 90-day gateway-event sweep above follows: Cloud Scheduler
   * bills per REGISTERED JOB (~$0.10/month each, 3 free, 28 already live), and
   * expiry is a once-a-day question whose answer does not need its own cadence.
   *
   * 🛑 It is not a cleanup in the delete sense, and that is why it comes last
   * and is logged separately. The other three blocks remove rows nobody needs;
   * this one DEBITS A BUYER by writing an adjustment entry. Burying that count
   * inside "cleanup complete" would make a line of real money read as
   * housekeeping.
   *
   * Bounded per run, and saturation is reported — at 200 expiries in one day
   * there are more waiting, which is a fact about the programme's size rather
   * than an error, but it must not look like the whole number.
   */
  let pointsExpired = { examined: 0, expired: 0, points: 0 };
  try {
    pointsExpired = await pointsRepository.expireLapsedBatches(ctx.now);
    if (pointsExpired.expired > 0) {
      ctx.logger.info("Points expiry complete", { ...pointsExpired });
    }
    if (pointsExpired.examined === 200) {
      ctx.logger.warn(
        "Points expiry hit its page limit — more batches are due than were processed",
      );
    }
  } catch (err) {
    void normalizeError(err);
    /*
     * Never fails the cleanup. An unexpired batch stays spendable for another
     * day, which costs us a day of liability and costs the buyer nothing —
     * strictly the safe direction, and the next run picks it up because the
     * query is driven by `expiresAt` rather than by a cursor.
     */
    ctx.logger.error("Points expiry failed — batches stay spendable for now");
  }

  ctx.logger.info("Daily data cleanup complete", {
    sessionsDeleted,
    tokensDeleted: emailDeleted + pwDeleted,
    gatewayEventsDeleted: eventsDeleted,
    pointsBatchesExpired: pointsExpired.expired,
    pointsExpired: pointsExpired.points,
  });
}
