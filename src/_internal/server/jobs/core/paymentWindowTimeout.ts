import { normalizeError } from "../../../../errors/normalize";
import { reconcileStuckGatewayEvents } from "./paymentReconcile";
/* Phase 8 — the job retry sweep. Folded in here rather than given its own
 * Scheduler job; see its own docstring and the 🛑 at the call site. */
import { runDueJobRetries } from "./onJobCreated";
import type { JobContext } from "../runtime/types";

/**
 * The 5-minute sweep. Runs `EVERY_5_MIN`.
 *
 * 🛑 IT NO LONGER SWEEPS A PAYMENT WINDOW. That half was deleted 2026-11-12
 * with the out-of-band tenders it served (see the block at the end of the
 * function). What remains is this job's two PASSENGERS, both of which need a
 * 5-minute cadence and neither of which is worth its own Cloud Scheduler
 * registration:
 *
 * · `reconcileStuckGatewayEvents` — webhook events we received and lost. A
 *   money path.
 * · `runDueJobRetries` — queued jobs whose backoff has elapsed. Nothing else
 *   in the system will ever run them.
 *
 * ⚠ The NAME is now the schedule slot, not the work. It is kept because it is
 * the registered Scheduler job id; read the two calls below for what actually
 * happens here.
 */
export async function runPaymentWindowTimeout(ctx: JobContext): Promise<void> {
  /*
   * ── R1 rides along: gateway events we received and lost ───────────────────
   *
   * Folded into this sweep rather than given its own cron, for two reasons that
   * both matter. Cloud Scheduler bills **per registered job**, so a fifth
   * 5-minute function is a real recurring cost for one indexed read. And this
   * job already runs at the cadence R1 needs: a webhook whose handler died
   * mid-dispatch leaves a lapsed lease, and noticing that within ~5 minutes
   * rather than up to 24 hours is the difference between the gateway's own
   * retry still being in flight and a buyer having already emailed support.
   *
   * 🛑 FIRST, and outside the early return below. The original shape of this
   * function returns as soon as there are no expired payment windows — which is
   * most ticks — so appending R1 after that return would have made it run only
   * on the minority of ticks that happened to have unrelated work. That is the
   * sweep-coverage trap Root Cause #27 is about: three sweeps whose filters
   * were each disjoint, with no proof any order was covered by one.
   *
   * It never throws: a reconciliation failure must not stop the payment-window
   * cancellations this job exists for.
   */
  try {
    const r1 = await reconcileStuckGatewayEvents(ctx);
    if (r1.redispatched > 0 || r1.escalated > 0) {
      ctx.logger.warn("R1: recovered stuck gateway events", { ...r1 });
    }
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("R1 failed inside paymentWindowTimeout — continuing with the sweep", {
      err,
    });
  }

  /*
   * ── Phase 8 rides along too: job retries whose backoff has elapsed ────────
   *
   * Same two reasons as R1 above, and the same placement rule: **FIRST, before
   * the early return**. A retry is a `pending` job document with a future
   * `nextAttemptAt`, and nothing else in the system will ever run it — the
   * create trigger deliberately defers to this sweep, because creating the
   * retry document fires that trigger instantly and would collapse the backoff
   * to zero.
   *
   * So if this call sat after the early return, a retry would run only on a
   * tick that happened to have an expired payment window — which is the
   * minority — and a job scheduled on a quiet afternoon could wait hours.
   * Root Cause #27 again, now with a second mechanism depending on it.
   *
   * Never throws, for the same reason R1 does not: a stuck job must not stop
   * the payment-window cancellations this function exists for.
   */
  try {
    const retries = await runDueJobRetries(ctx);
    if (retries.ran > 0) {
      ctx.logger.info("Phase 8: ran due job retries", { ...retries });
    }
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("job retry sweep failed inside paymentWindowTimeout — continuing", {
      err,
    });
  }

  /*
   * ── 🛑 THE PAYMENT-WINDOW HALF OF THIS JOB WAS DELETED 2026-11-12 ─────────
   *
   * It scanned `getExpiredPaymentDeadlines()` and, for each row, cancelled the
   * order, restored its stock and emailed the buyer. Every part of that chain
   * is now unreachable: checkout stopped stamping `paymentDeadline`, the field
   * is off `OrderDocument`, and a Firestore range filter cannot match an
   * absent field. The query returned an empty page on every tick, took the
   * early return, and logged "No expired payment-window orders found" — a
   * sweep reporting success for work it could not find.
   *
   * ⚠ Deleting the early return is the part that actually matters here. R1 and
   * the Phase 8 retry sweep above were placed FIRST precisely because this
   * function used to return early on most ticks (Root Cause #27). With the
   * payment-window half gone there is no early return left to trip over, so
   * both passengers now run unconditionally — which is what their own
   * docstrings always asked for.
   *
   * 🛑 THE JOB AND ITS SCHEDULE STAY. `paymentWindowTimeout` is the registered
   * Cloud Scheduler name and the HOST for `reconcileStuckGatewayEvents` (a
   * money path) and `runDueJobRetries`. Its name now describes the 5-minute
   * SLOT rather than the work; renaming it would rename a live Scheduler job,
   * which is an infrastructure change and not this commit's business.
   */
  ctx.logger.info("5-minute sweep complete", {
    note: "gateway-event reconciliation + due job retries",
  });
}
