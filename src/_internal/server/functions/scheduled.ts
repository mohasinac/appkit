// Scheduled function definitions (Cloud Scheduler triggers).
// Cron syntax accepts both Firebase shorthand and standard cron expressions.

import {
  auctionSettlementHandler,
  autoPayoutEligibilityHandler,
  bundleStockSyncHandler,
  cartPruneHandler,
  cleanupRtdbEventsHandler,
  countersReconcileHandler,
  couponExpiryHandler,
  dailyDataCleanupHandler,
  draftPruneHandler,
  emiInstallmentReminderHandler,
  catalogueImageStalenessReminderHandler,
  mediaTmpCleanupHandler,
  notificationPruneHandler,
  offerExpiryHandler,
  payoutBatchHandler,
  paymentWindowTimeoutHandler,
  hardBanReinstatementHandler,
  paymentReviewAutoApproveHandler,
  pendingOrderTimeoutHandler,
  positionsReconcileHandler,
  prizeDrawExpiryRevealHandler,
  productStatsSyncHandler,
  revenueRollupHandler,
  pageViewRollupHandler,
  pageViewPruneHandler,
  dailyStatusDigestHandler,
  weeklyPayoutEligibilityHandler,
  testerSandboxCleanupHandler,
  testerSandboxRefreshHandler,
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

export const paymentWindowTimeout = defineFunction({
  name: "paymentWindowTimeout",
  description: "Cancel + restock orders whose 15-minute manual-payment window expired without proof.",
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

export const productStatsSync = defineFunction({
  name: "productStatsSync",
  description: "Recompute aggregated product statistics (daily 01:00 UTC).",
  trigger: { kind: "schedule", cron: "0 1 * * *", timeZone: "UTC" },
  handler: productStatsSyncHandler,
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

export const positionsReconcile = defineFunction({
  name: "positionsReconcile",
  description: "Reconcile bid/auction positions (daily 03:30 UTC).",
  trigger: { kind: "schedule", cron: "30 3 * * *", timeZone: "UTC" },
  handler: positionsReconcileHandler,
  options: { region: REGION, timeoutSeconds: 120, memory: "256MiB", maxInstances: 1 },
});

export const payoutBatch = defineFunction({
  name: "payoutBatch",
  description: "Dispatch the day's payout batch (daily 06:00 UTC).",
  trigger: { kind: "schedule", cron: "0 6 * * *", timeZone: "UTC" },
  handler: payoutBatchHandler,
  options: { region: REGION, timeoutSeconds: 540, memory: "256MiB", maxInstances: 1 },
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

export const testerSandboxCleanup = defineFunction({
  name: "testerSandboxCleanup",
  description: "Delete expired tester QA sandbox test data (daily 05:00 UTC).",
  trigger: { kind: "schedule", cron: "0 5 * * *", timeZone: "UTC" },
  handler: testerSandboxCleanupHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "256MiB", maxInstances: 1 },
});

export const testerSandboxRefresh = defineFunction({
  name: "testerSandboxRefresh",
  description: "Revert live tester QA sandbox fixtures to their canonical seed shape and prune tester-created extras (every 4 hours).",
  trigger: { kind: "schedule", cron: "0 */4 * * *", timeZone: "UTC" },
  handler: testerSandboxRefreshHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "256MiB", maxInstances: 1 },
});

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
  productStatsSync,
  revenueRollup,
  pageViewRollup,
  pageViewPrune,
  dailyStatusDigest,
  dailyDataCleanup,
  countersReconcile,
  positionsReconcile,
  payoutBatch,
  cartPrune,
  notificationPrune,
  weeklyPayoutEligibility,
  autoPayoutEligibility,
  cleanupRtdbEvents,
  mediaTmpCleanup,
  draftPrune,
  testerSandboxCleanup,
  testerSandboxRefresh,
  prizeDrawExpiryReveal,
  bundleStockSync,
  emiInstallmentReminder,
  catalogueImageStalenessReminder,
] as const;
