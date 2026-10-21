import { sessionRepository, tokenRepository } from "../../../../repositories";
import { gatewayEventsRepository } from "../../../../features/gateway-events/repository/gateway-events.repository";
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

  ctx.logger.info("Daily data cleanup complete", {
    sessionsDeleted,
    tokensDeleted: emailDeleted + pwDeleted,
    gatewayEventsDeleted: eventsDeleted,
  });
}
