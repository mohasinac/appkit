// Scheduled function definitions (Cloud Scheduler triggers).
// Cron syntax accepts both Firebase shorthand and standard cron expressions.

import {
  auctionSettlementHandler,
  autoPayoutEligibilityHandler,
  bundleStockSyncHandler,
  cartPruneHandler,
  cleanupRtdbEventsHandler,
  countersReconcileHandler,
  boxRollupReconcileHandler,
  couponExpiryHandler,
  dailyDataCleanupHandler,
  draftPruneHandler,
  emiInstallmentReminderHandler,
  catalogueImageStalenessReminderHandler,
  mediaTmpCleanupHandler,
  notificationPruneHandler,
  offerExpiryHandler,
  reservationExpiryHandler,
  obligationSweepHandler,
  paymentReconcileHandler,
  paymentWindowTimeoutHandler,
  hardBanReinstatementHandler,
  paymentReviewAutoApproveHandler,
  pendingOrderTimeoutHandler,
  positionsReconcileHandler,
  prizeDrawExpiryRevealHandler,
  productStatsSyncHandler,
  revenueRollupHandler,
  sellerStandingRollupHandler,
  priceIndexRollupHandler,
  marketPriceRollupHandler,
  searchIndexBuildHandler,
  analyticsAlertEvaluateHandler,
  pageViewRollupHandler,
  pageViewPruneHandler,
  dailyStatusDigestHandler,
  weeklyPayoutEligibilityHandler,
  testDataCleanupHandler,
} from "../jobs/handlers";
import { defineFunction } from "./define";

const REGION = "asia-south1";
const EVERY_5_MIN = "every 5 minutes";

export const auctionSettlement = defineFunction({
  name: "auctionSettlement",
  description: "Settle expired auctions every 15 minutes and notify winners.",
  trigger: { kind: "schedule", cron: "every 15 minutes", timeZone: "UTC" },
  handler: auctionSettlementHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "256MiB", maxInstances: 1 },
});

export const pendingOrderTimeout = defineFunction({
  name: "pendingOrderTimeout",
  description: "Cancel pending COD orders that exceeded the 24h timeout window (orders with a paymentDeadline are paymentWindowTimeout's domain instead).",
  trigger: { kind: "schedule", cron: "0 */2 * * *" },
  handler: pendingOrderTimeoutHandler,
  options: { region: REGION, timeoutSeconds: 120, memory: "256MiB", maxInstances: 1 },
});

/*
 * ── 🛑 THE "RETIRE THREE SWEEPS" PLAN STEP IS SELF-CONTRADICTORY ────────────
 *
 * Phase 8's plan text reads: *"a retry is a new document … picked up by a
 * sweep folded into `paymentWindowTimeout` … **Then** retire the three
 * superseded sweeps"* — and names those three as `pendingOrderTimeout`,
 * **`paymentWindowTimeout`** and `paymentReviewAutoApprove`.
 *
 * It cannot be both. `paymentWindowTimeout` is now the HOST of the job-retry
 * sweep (see `runDueJobRetries`, called first in its handler, before the early
 * return), so retiring it would delete the only mechanism that runs a
 * scheduled retry — and the create trigger deliberately defers to that sweep,
 * because creating the retry document fires the trigger instantly and would
 * collapse the backoff to zero. Deleting the host leaves every retry
 * permanently `pending`: a stall that reads as a queue, which is the exact
 * failure Phase 8 exists to remove.
 *
 * So the retry/DLQ half is built and the retirement is NOT done. That is a
 * deliberate stop, not an omission:
 *
 *  - These three cancel unpaid orders and restock real inventory. Deleting
 *    them on the strength of a plan line, in a session that cannot run a
 *    single check, is the autonomous destructive decision Rule #1 forbids.
 *  - The claim that obligations supersede them needs reading all three
 *    against the obligation policies AND confirming `obligationSweep`'s `act`
 *    tier covers each — and the sweep's own comment records that its acting
 *    branch was narrowed precisely because monetary outcomes were not safe to
 *    automate. That narrowing was widened for six kinds; whether it covers
 *    these three is a measurement, not an inference.
 *  - The Scheduler arithmetic in the plan (34 → 31) is therefore unchanged by
 *    this commit. Nothing was added either, so the count stands wherever it
 *    actually is — and CLAUDE.md says to recount rather than quote it, this
 *    number having drifted six times.
 *
 * Whoever takes the retirement: pick a different host for the retry sweep
 * first, or keep `paymentWindowTimeout` and retire only the other two.
 *
 * ── 🛑 MEASURED 2026-10-23: RETIRE NEITHER OF THE OTHER TWO EITHER ─────────
 *
 * The paragraph above asks for a measurement rather than an inference —
 * *"whether [`obligationSweep`'s act tier] covers these three is a
 * measurement"* — so here it is. **It does not cover either of them, and the
 * answer is a single predicate.**
 *
 * `OBLIGATION_POLICIES["seller-accept"]` is the only candidate for
 * `pendingOrderTimeout`, and its precondition opens with:
 *
 *     precondition: (o) => isPaid(o) && notTerminal(o) && !o.acceptedAt && …
 *     duration: { value: 3, unit: "days" }
 *
 * with `const isPaid = (o) => o.paymentStatus === "paid"`. A pending COD order
 * is **not paid** — that is the entire point of COD — so the policy EXCLUDES
 * exactly the orders this sweep exists for, and waits three days where the
 * sweep acts at 24 hours. Pairwise disjoint, which is the same failure shape
 * the obligations collection was built to end (Root Cause #27: three sweeps,
 * pairwise disjoint, an order holding stock forever).
 *
 * `paymentReviewAutoApprove` has no candidate at all. The ONLY policy
 * mentioning `paymentReviewOutcome` is `proof-reupload`, keyed on
 * `=== "reupload_requested"` — the BUYER re-uploading, not staff failing to
 * review. Nothing in the twelve kinds means "a proof nobody looked at".
 *
 * **Retiring them would therefore**: leave unpaid COD orders holding real
 * stock forever, and leave an uploaded proof nobody reviewed in limbo forever.
 * Both silent — an order that is never cancelled raises nothing.
 *
 * So the correct state is THREE sweeps kept, not one. The plan's "retire the
 * other two" was an inference from a coverage claim that measurement does not
 * support, and this note exists so the next reader does not re-derive it from
 * the same plan line.
 */
export const paymentWindowTimeout = defineFunction({
  name: "paymentWindowTimeout",
  description:
    "Cancel + restock orders whose 15-minute manual-payment window expired without proof. Also hosts R1 (stuck gateway events) and the Phase 8 job-retry sweep, both before its early return.",
  trigger: { kind: "schedule", cron: EVERY_5_MIN },
  handler: paymentWindowTimeoutHandler,
  options: { region: REGION, timeoutSeconds: 120, memory: "256MiB", maxInstances: 1 },
});

export const hardBanReinstatement = defineFunction({
  name: "hardBanReinstatement",
  description: "Re-enable Auth login for temporary hard-bans past their expiry.",
  trigger: { kind: "schedule", cron: "*/15 * * * *" },
  handler: hardBanReinstatementHandler,
  options: { region: REGION, timeoutSeconds: 120, memory: "256MiB", maxInstances: 1 },
});

export const paymentReviewAutoApprove = defineFunction({
  name: "paymentReviewAutoApprove",
  description: "Auto-approve manual payment proofs unreviewed after 2 hours.",
  trigger: { kind: "schedule", cron: "*/15 * * * *" },
  handler: paymentReviewAutoApproveHandler,
  options: { region: REGION, timeoutSeconds: 120, memory: "256MiB", maxInstances: 1 },
});

export const couponExpiry = defineFunction({
  name: "couponExpiry",
  description: "Mark coupons inactive past their endDate (daily 00:05 UTC).",
  trigger: { kind: "schedule", cron: "5 0 * * *", timeZone: "UTC" },
  handler: couponExpiryHandler,
  options: { region: REGION, timeoutSeconds: 120, memory: "256MiB", maxInstances: 1 },
});

export const offerExpiry = defineFunction({
  name: "offerExpiry",
  description: "Mark offers inactive past their endDate (daily 00:15 UTC).",
  trigger: { kind: "schedule", cron: "15 0 * * *", timeZone: "UTC" },
  handler: offerExpiryHandler,
  options: { region: REGION, timeoutSeconds: 120, memory: "256MiB", maxInstances: 1 },
});

/*
 * 🛑 The ONLY bound on a leaked stock hold.
 *
 * Every other way a reservation ends is an action somebody takes; this is
 * what happens when nobody does. Without it a hold is permanent, and a
 * permanent hold is indistinguishable from stock the seller no longer has —
 * with no error anywhere, because a lower `availableQuantity` is just a
 * number.
 *
 * Every 15 minutes rather than daily: the default hold is 72 hours, so the
 * cadence is not about precision, it is about the WORST case. A daily sweep
 * means "expired at 09:01, buyable again tomorrow", and a buyer told an item
 * is sold out for a day after the hold lapsed is the failure this prevents.
 */
export const reservationExpiry = defineFunction({
  name: "reservationExpiry",
  description: "Expire stock reservations past their TTL and restore availableQuantity (every 15 minutes).",
  trigger: { kind: "schedule", cron: "every 15 minutes" },
  handler: reservationExpiryHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "256MiB", maxInstances: 1 },
});

export const productStatsSync = defineFunction({
  name: "productStatsSync",
  description: "Recompute aggregated product statistics (daily 01:00 UTC).",
  trigger: { kind: "schedule", cron: "0 1 * * *", timeZone: "UTC" },
  handler: productStatsSyncHandler,
  options: { region: REGION, timeoutSeconds: 540, memory: "256MiB", maxInstances: 1 },
});

/**
 * Seller standing — MONTHLY, on the last day of the month.
 *
 * 🛑 `28-31`, never `31`. Cloud Scheduler is unix-cron with no `L` token, so
 * `0 2 31 * *` **never fires in February, April, June, September or
 * November** — it would silently skip 5 of 12 months and present as a tier
 * that updates "sometimes". This fires on each candidate day and
 * `isLastDayOfMonth` in the core keeps exactly the real one, so at most 3 of
 * the 4 invocations are no-ops that return before reading anything.
 *
 * 540s because it scans a 90-day window of orders and reviews, then writes
 * one document per store. `maxInstances: 1` because two concurrent runs would
 * both compute a tier and race on the same store documents.
 */
export const sellerStandingRollup = defineFunction({
  name: "sellerStandingRollup",
  description:
    "Recompute seller standing on the last day of each month and grant/revoke the Trusted Seller tier, which also sets trustedSeller (paid at shipping). Fires on days 28-31; the handler keeps only the real month-end.",
  trigger: { kind: "schedule", cron: "0 2 28-31 * *", timeZone: "UTC" },
  handler: sellerStandingRollupHandler,
  options: { region: REGION, timeoutSeconds: 540, memory: "256MiB", maxInstances: 1 },
});

export const revenueRollup = defineFunction({
  name: "revenueRollup",
  description: "Pre-compute total delivered-order revenue into analytics/dashboardRollup, replacing an unbounded per-request scan (daily 01:30 UTC).",
  trigger: { kind: "schedule", cron: "30 1 * * *", timeZone: "UTC" },
  handler: revenueRollupHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "256MiB", maxInstances: 1 },
});

/*
 * The realised-price index — 04:30 UTC, i.e. **10:00 IST**, the cadence the
 * page states as "prices as of".
 *
 * 🛑 Its OWN function rather than a pass inside `countersReconcile`, which
 * already runs at its 540s ceiling. A separate job can fail without taking
 * category metrics down with it, and the two share nothing beyond reading
 * products.
 *
 * It writes `priceIndex/{leafId}` and never `categories` — see the
 * repository's header for why that is not a preference. A job writing a price
 * band onto the collection `onCategoryWrite` watches is Root Cause #92's exact
 * shape (1,017,548 invocations in 24h), and `notifyRevalidate` would
 * additionally drop each category page's ISR entry nightly on a project that
 * was paused for exceeding ISR writes by 15.5×.
 */
/*
 * Build the public search index artifact — every 15 minutes, but it EXITS on
 * one read unless something changed.
 *
 * 🛑 The cadence is not the cost. Firestore bills per document read
 * regardless of `select()`, so a full rebuild at this cadence would be
 * ~358,000 reads/day against a 50,000/day tier. The job is idle-exit /
 * incremental / daily-full instead, landing at ~4,000/day. See the core's
 * header; it logs its mode and read count on every run so a regression to
 * always-full is visible before it is a quota wall.
 *
 * Its own job rather than folded into an existing cadence: `countersReconcile`
 * and `productStatsSync` already run near their 540s ceiling, and a rebuild
 * failing inside one would take category metrics down with it — the argument
 * `priceIndexRollup` makes directly below.
 */
export const searchIndexBuild = defineFunction({
  name: "searchIndexBuild",
  description:
    "Build the public search index artifact into Storage (idle-exit / incremental / daily full).",
  trigger: { kind: "schedule", cron: "*/15 * * * *", timeZone: "UTC" },
  handler: searchIndexBuildHandler,
  options: { region: REGION, timeoutSeconds: 540, memory: "512MiB", maxInstances: 1 },
});

export const priceIndexRollup = defineFunction({
  name: "priceIndexRollup",
  description:
    "Roll up realised sale prices per leaf category into priceIndex/{leafId} (daily 04:30 UTC = 10:00 IST).",
  trigger: { kind: "schedule", cron: "30 4 * * *", timeZone: "UTC" },
  handler: priceIndexRollupHandler,
  options: { region: REGION, timeoutSeconds: 540, memory: "512MiB", maxInstances: 1 },
});

/*
 * The ASKING half of the same page, from dated `priceObservations` rows.
 *
 * 🛑 A separate function from `priceIndexRollup`, not a second pass inside it,
 * and the reason is the one that file already states for itself: these two
 * bands are *"rendered side by side and never averaged"*. Sharing a function
 * would also share a failure — a bad observation import taking the realised-
 * sale index down with it, when the two read entirely different collections and
 * have no reason to fail together.
 *
 * 05:00 UTC, half an hour after the sold half: both feed one page, and running
 * them adjacently means a reader never sees one half a day fresher than the
 * other. Not simultaneously — `maxInstances: 1` on each, but they would still
 * contend for the same Firestore read budget in the same minute for no gain.
 */
export const marketPriceRollup = defineFunction({
  name: "marketPriceRollup",
  description:
    "Roll up dated price observations into marketPriceIndex/{leafId} — mode, 6-month low/high (daily 05:00 UTC = 10:30 IST).",
  trigger: { kind: "schedule", cron: "0 5 * * *", timeZone: "UTC" },
  handler: marketPriceRollupHandler,
  options: { region: REGION, timeoutSeconds: 540, memory: "512MiB", maxInstances: 1 },
});

/*
 * Evaluate the alert rules sellers and admins configured — hourly, 20 past.
 *
 * 🛑 This feature had a schema, a CRUD UI, two API routes, four seeded
 * fixtures and **no evaluator anywhere**: zero references across all 59 job
 * files, with `lastTriggeredAt` declared and written nowhere. So every alert a
 * seller configured could never fire.
 *
 * Hourly rather than daily, because an alert whose point is "tell me when
 * nothing is selling" is useless a day late — and the job's own 24h
 * re-notify cooldown is what stops hourly evaluation becoming hourly mail.
 * 20 past the hour keeps it clear of the dense :00/:15 band.
 */
export const analyticsAlertEvaluate = defineFunction({
  name: "analyticsAlertEvaluate",
  description:
    "Evaluate seller and admin analytics alerts against live metrics and notify on a crossing (hourly at :20).",
  trigger: { kind: "schedule", cron: "20 * * * *", timeZone: "UTC" },
  handler: analyticsAlertEvaluateHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "256MiB", maxInstances: 1 },
});

/*
 * The rollup runs BEFORE the prune, and both before the retention boundary
 * moves. `pageViews` had neither until 2026-08-31: it wrote one document per
 * entity per day, forever, and was the only unbounded writer among 27 scheduled
 * functions.
 *
 * Order matters — the prune deletes the day-buckets the rollup reads, so a
 * prune that ran first would delete views nobody had counted yet. 01:45 then
 * 02:15, either side of nothing else.
 */
export const pageViewRollup = defineFunction({
  name: "pageViewRollup",
  description: "Fold new page-view day-buckets into analytics/pageViewRollup so the prune below cannot delete uncounted views (daily 01:45 UTC).",
  trigger: { kind: "schedule", cron: "45 1 * * *", timeZone: "UTC" },
  handler: pageViewRollupHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "256MiB", maxInstances: 1 },
});

export const pageViewPrune = defineFunction({
  name: "pageViewPrune",
  description: "Delete page-view day-buckets past the 90-day retention window; lifetime totals survive in the rollup (daily 02:15 UTC).",
  trigger: { kind: "schedule", cron: "15 2 * * *", timeZone: "UTC" },
  handler: pageViewPruneHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "256MiB", maxInstances: 1 },
});

export const dailyStatusDigest = defineFunction({
  name: "dailyStatusDigest",
  description: "Email the previous 24h order summary + platform status to the team every morning at 10:00 IST.",
  trigger: { kind: "schedule", cron: "0 10 * * *", timeZone: "Asia/Kolkata" },
  handler: dailyStatusDigestHandler,
  options: { region: REGION, timeoutSeconds: 120, memory: "256MiB", maxInstances: 1 },
});

export const dailyDataCleanup = defineFunction({
  name: "dailyDataCleanup",
  description: "Daily data cleanup (drafts, transient records) at 02:00 UTC.",
  trigger: { kind: "schedule", cron: "0 2 * * *", timeZone: "UTC" },
  handler: dailyDataCleanupHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "256MiB", maxInstances: 1 },
});

export const countersReconcile = defineFunction({
  name: "countersReconcile",
  description: "Reconcile aggregated counters against source-of-truth queries (daily 03:00 UTC).",
  trigger: { kind: "schedule", cron: "0 3 * * *", timeZone: "UTC" },
  handler: countersReconcileHandler,
  options: { region: REGION, timeoutSeconds: 540, memory: "256MiB", maxInstances: 1 },
});

/**
 * Payment reconciliation — R2, R3 and R4. Daily 05:30 UTC.
 *
 * 🛑 ITS OWN FUNCTION, and the two obvious places to fold it are both wrong.
 *
 * `countersReconcile` above already runs at its 540 s ceiling, so adding work
 * there is how a job starts timing out and taking category metrics with it.
 * `autoPayoutEligibility` is tempting because both touch orders, but
 * `priceIndexRollup`'s own comment sets the precedent: a job should be able to
 * fail without taking an unrelated one down, and these two share nothing beyond
 * the collection.
 *
 * Cloud Scheduler bills **per registered job** (3 free, 28 already registered),
 * so this is ~$0.10/month — a cost the Firebase budget table explicitly accepts
 * for a distinct cadence rather than contorting the schedule around it.
 *
 * 🛑 R1 is NOT here. It is folded into `paymentWindowTimeout` (every 5 minutes),
 * because a webhook we received and lost should not wait up to 24 hours to be
 * noticed — and its query is one indexed read, so the tight loop is free.
 *
 * 05:30 UTC = 11:00 IST, deliberately after `countersReconcile` (03:00) and
 * `autoPayoutEligibility` so a payout decision is never taken on the same tick
 * as the reconciliation that might open a case blocking it.
 */
/**
 * Every deadline in the order lifecycle — one job, every 5 minutes.
 *
 * 🛑 ONE JOB FOR ~20 SCENARIOS, and the Scheduler count goes DOWN.
 *
 * The alternative was a cron per scenario, which is ~$2/month *and* `O(n²)`
 * coverage reasoning — D25, D27 and the duplicate buyout notification are all
 * that pattern failing. Here it is one indexed query per tick, empty when idle,
 * and `obligations`' deterministic document id gives "at most one open
 * obligation per (subject, kind)" so a double reconcile is a no-op.
 *
 * Phase 8 retires `paymentWindowTimeout`, `pendingOrderTimeout` and
 * `paymentReviewAutoApprove` once their policy rows are proven, taking the
 * registered count **28 → 29 → 27**.
 *
 * 🛑 NOT a Firestore trigger on `orders`. A trigger writing `obligations`
 * whose sweep writes `orders` is Root Cause #92's self-write loop — the one
 * that cost 1,017,548 invocations in 24 hours. Obligations are reconciled
 * inside the order's own write, where the document is already in hand.
 */
export const obligationSweep = defineFunction({
  name: "obligationSweep",
  description:
    "Fire, warn on, or escalate every order-lifecycle deadline that has come due (every 5 minutes).",
  trigger: { kind: "schedule", cron: EVERY_5_MIN },
  handler: obligationSweepHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "256MiB", maxInstances: 1 },
});

export const paymentReconcile = defineFunction({
  name: "paymentReconcile",
  description:
    "Reconcile the gateway's payments, refunds and disputes against our orders; open paymentCases (daily 05:30 UTC).",
  trigger: { kind: "schedule", cron: "30 5 * * *", timeZone: "UTC" },
  handler: paymentReconcileHandler,
  options: { region: REGION, timeoutSeconds: 540, memory: "256MiB", maxInstances: 1 },
});

/**
 * 🛑 ITS OWN FUNCTION, AND DELIBERATELY NOT A FIRESTORE TRIGGER.
 *
 * A trigger on `inventoryPlacements` writing back to `storageBoxes` would fire
 * on every pick, move and receive — a 50-row receive is 50 placement writes and
 * would wake it 50 times to recompute the same two boxes. It is also one
 * refactor away from Root Cause #92's shape, which cost 1,017,548 invocations
 * in 24 hours against a 2M/month free quota.
 *
 * Nightly is right because the rollup is ADVISORY: every surface that must be
 * correct reads placements directly (the box detail page does, and says so),
 * so a day-stale rollup costs a slightly wrong number in a list and never a
 * wrong decision.
 *
 * 🛑 06:15 UTC, AND THE SLOT WAS CHOSEN BY COUNTING, NOT BY EYE. My first
 * pick was 04:30 with a comment claiming it kept three collection-walking jobs
 * out of the same minute — while `30 4 * * *` ALREADY held two
 * (`priceIndexRollup` at 540s/512MiB among them), so it would have made three
 * and the comment would have asserted the opposite of what it did.
 *
 * `grep -o 'cron: "…"' | sort | uniq -c` over this file is the check: 06:15 is
 * empty, clear of the dense 00:00–05:30 band and of the 10:00 IST digest.
 */
export const boxRollupReconcile = defineFunction({
  name: "boxRollupReconcile",
  description:
    "Recompute each storage box's product/unit rollup from its real placements (daily 06:15 UTC).",
  trigger: { kind: "schedule", cron: "15 6 * * *", timeZone: "UTC" },
  handler: boxRollupReconcileHandler,
  options: { region: REGION, timeoutSeconds: 540, memory: "256MiB", maxInstances: 1 },
});

export const positionsReconcile = defineFunction({
  name: "positionsReconcile",
  description: "Reconcile bid/auction positions (daily 03:30 UTC).",
  trigger: { kind: "schedule", cron: "30 3 * * *", timeZone: "UTC" },
  handler: positionsReconcileHandler,
  options: { region: REGION, timeoutSeconds: 120, memory: "256MiB", maxInstances: 1 },
});

export const cartPrune = defineFunction({
  name: "cartPrune",
  description: "Prune abandoned carts (weekly Sunday 04:00 UTC).",
  trigger: { kind: "schedule", cron: "0 4 * * 0", timeZone: "UTC" },
  handler: cartPruneHandler,
  options: { region: REGION, timeoutSeconds: 120, memory: "256MiB", maxInstances: 1 },
});

export const notificationPrune = defineFunction({
  name: "notificationPrune",
  description: "Prune read notifications older than retention window (weekly Monday 01:00 UTC).",
  trigger: { kind: "schedule", cron: "0 1 * * 1", timeZone: "UTC" },
  handler: notificationPruneHandler,
  options: { region: REGION, timeoutSeconds: 120, memory: "256MiB", maxInstances: 1 },
});

export const weeklyPayoutEligibility = defineFunction({
  name: "weeklyPayoutEligibility",
  description: "Recompute seller payout eligibility weekly (Saturday 05:00 UTC).",
  trigger: { kind: "schedule", cron: "0 5 * * 6", timeZone: "UTC" },
  handler: weeklyPayoutEligibilityHandler,
  options: { region: REGION, timeoutSeconds: 540, memory: "256MiB", maxInstances: 1 },
});

export const autoPayoutEligibility = defineFunction({
  name: "autoPayoutEligibility",
  description: "Recompute auto-payout eligibility (daily 04:45 UTC).",
  trigger: { kind: "schedule", cron: "45 4 * * *", timeZone: "UTC" },
  handler: autoPayoutEligibilityHandler,
  options: { region: REGION, timeoutSeconds: 540, memory: "256MiB", maxInstances: 1 },
});

export const cleanupRtdbEvents = defineFunction({
  name: "cleanupRtdbEvents",
  description: "Reap stale RTDB auth-event nodes every 5 minutes.",
  trigger: { kind: "schedule", cron: EVERY_5_MIN },
  handler: cleanupRtdbEventsHandler,
  options: { region: REGION, timeoutSeconds: 60, memory: "256MiB", maxInstances: 1 },
});

export const mediaTmpCleanup = defineFunction({
  name: "mediaTmpCleanup",
  description: "Delete orphaned tmp/* media uploads (daily 04:30 IST).",
  trigger: { kind: "schedule", cron: "30 4 * * *", timeZone: "Asia/Kolkata" },
  handler: mediaTmpCleanupHandler,
  options: { region: REGION, timeoutSeconds: 540, memory: "256MiB", maxInstances: 1 },
});

export const draftPrune = defineFunction({
  name: "draftPrune",
  description: "Prune store form drafts older than 30 days (weekly Sunday 03:00 UTC).",
  trigger: { kind: "schedule", cron: "0 3 * * 0", timeZone: "UTC" },
  handler: draftPruneHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "256MiB", maxInstances: 1 },
});

/*
 * 🛑 RENAMED from `testerSandboxCleanup` (2026-10-10, plan §7). The job never
 * had anything to do with the tester HARNESS — it sweeps any document carrying
 * `isTestData: true` past its `testDataExpiresAt`, which is a seed-data concern
 * and outlives the human tester programme being retired in B2.
 *
 * 🛑 A Scheduler job rename is DELETE-AND-RECREATE on deploy, not a rename:
 * `firebase deploy --only functions` creates `testDataCleanup` and leaves
 * `testerSandboxCleanup` running until it is explicitly deleted. Two jobs
 * sweeping the same documents is not redundancy — it is the two-owners race
 * that got `testerSandboxRefresh` removed (see the note below). Delete the old
 * function in the same deploy.
 */
export const testDataCleanup = defineFunction({
  name: "testDataCleanup",
  description: "Delete expired isTestData documents past their TTL (daily 05:00 UTC).",
  trigger: { kind: "schedule", cron: "0 5 * * *", timeZone: "UTC" },
  handler: testDataCleanupHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "256MiB", maxInstances: 1 },
});

// testerSandboxRefresh (every 4h: revert fixtures to seed shape, prune extras) was
// REMOVED. The tester runner now owns fixture state — it seeds a known catalog at the
// start of a run and wipes at the end — so a background job independently rewriting
// those same documents was redundant and, worse, raced a run in progress: it reset
// currentBid and recomputed auctionEndDate underneath a test that was mid-assertion.
// Do not reinstate it without also deciding who owns fixture state; two owners is the
// bug it caused. See tester/scripts/lifecycle.mjs.

export const prizeDrawExpiryReveal = defineFunction({
  name: "prizeDrawExpiryReveal",
  description: "Assign winners for outstanding paid orders on scheduled-mode prize draws past their expiry, then close them (every 5 minutes).",
  trigger: { kind: "schedule", cron: EVERY_5_MIN },
  handler: prizeDrawExpiryRevealHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "256MiB", maxInstances: 1 },
});

export const bundleStockSync = defineFunction({
  name: "bundleStockSync",
  description: "Flip bundle isSold when any item runs OOS (daily 10:05 IST).",
  trigger: { kind: "schedule", cron: "5 10 * * *", timeZone: "Asia/Kolkata" },
  handler: bundleStockSyncHandler,
  options: { region: REGION, timeoutSeconds: 540, memory: "256MiB", maxInstances: 1 },
});

export const emiInstallmentReminder = defineFunction({
  name: "emiInstallmentReminder",
  description: "Nudge buyers on upcoming EMI installments and flag overdue ones (daily 09:00 IST).",
  trigger: { kind: "schedule", cron: "0 9 * * *", timeZone: "Asia/Kolkata" },
  handler: emiInstallmentReminderHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "256MiB", maxInstances: 1 },
});

export const catalogueImageStalenessReminder = defineFunction({
  name: "catalogueImageStalenessReminder",
  description: "Remind catalogue owners whose photos are nearing the 30-day freshness cutoff (daily 07:00 IST).",
  trigger: { kind: "schedule", cron: "0 7 * * *", timeZone: "Asia/Kolkata" },
  handler: catalogueImageStalenessReminderHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "256MiB", maxInstances: 1 },
});

export const SCHEDULED_FUNCTIONS = [
  auctionSettlement,
  pendingOrderTimeout,
  paymentWindowTimeout,
  hardBanReinstatement,
  paymentReviewAutoApprove,
  couponExpiry,
  offerExpiry,
  reservationExpiry,
  productStatsSync,
  revenueRollup,
  priceIndexRollup,
  marketPriceRollup,
  searchIndexBuild,
  analyticsAlertEvaluate,
  pageViewRollup,
  pageViewPrune,
  dailyStatusDigest,
  dailyDataCleanup,
  countersReconcile,
  /*
   * 🛑 Registering here is NOT optional and is easy to miss: `defineFunction`
   * only creates the definition — `SCHEDULED_FUNCTIONS` is what
   * `APPKIT_FUNCTIONS` spreads and `bindAllFromRegistry` binds. A function
   * defined and not listed deploys nowhere and NOTHING ERRORS: the export
   * exists, the file compiles, and the job simply never runs. That is the same
   * silent-omission shape as `audit-barrel-no-seed`'s (an export whose absence
   * makes a loader quietly skip a collection).
   */
  paymentReconcile,
  obligationSweep,
  boxRollupReconcile,
  positionsReconcile,
  cartPrune,
  notificationPrune,
  weeklyPayoutEligibility,
  autoPayoutEligibility,
  cleanupRtdbEvents,
  mediaTmpCleanup,
  draftPrune,
  testDataCleanup,
  prizeDrawExpiryReveal,
  bundleStockSync,
  emiInstallmentReminder,
  catalogueImageStalenessReminder,
] as const;
