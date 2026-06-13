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
  mediaTmpCleanupHandler,
  notificationPruneHandler,
  offerExpiryHandler,
  payoutBatchHandler,
  pendingOrderTimeoutHandler,
  positionsReconcileHandler,
  prizeRevealCloseHandler,
  prizeRevealExpiryHandler,
  prizeRevealOpenHandler,
  prizeRevealReminderHandler,
  productStatsSyncHandler,
  weeklyPayoutEligibilityHandler,
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
  description: "Cancel pending orders that exceeded their timeout window.",
  trigger: { kind: "schedule", cron: "0 */2 * * *" },
  handler: pendingOrderTimeoutHandler,
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

export const prizeRevealOpen = defineFunction({
  name: "prizeRevealOpen",
  description: "Flip prize-draw reveals pending→open and send opening notifications.",
  trigger: { kind: "schedule", cron: EVERY_5_MIN },
  handler: prizeRevealOpenHandler,
  options: { region: REGION, timeoutSeconds: 120, memory: "256MiB", maxInstances: 1 },
});

export const prizeRevealClose = defineFunction({
  name: "prizeRevealClose",
  description: "Flip prize-draw reveals open→closed.",
  trigger: { kind: "schedule", cron: EVERY_5_MIN },
  handler: prizeRevealCloseHandler,
  options: { region: REGION, timeoutSeconds: 60, memory: "256MiB", maxInstances: 1 },
});

export const prizeRevealExpiry = defineFunction({
  name: "prizeRevealExpiry",
  description: "Auto-refund unrevealed prize-draw entries past deadline (every 6 hours UTC).",
  trigger: { kind: "schedule", cron: "0 */6 * * *", timeZone: "UTC" },
  handler: prizeRevealExpiryHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "256MiB", maxInstances: 1 },
});

export const prizeRevealReminder = defineFunction({
  name: "prizeRevealReminder",
  description: "Nudge prize-draw buyers <24h to deadline (daily 10:00 IST).",
  trigger: { kind: "schedule", cron: "0 10 * * *", timeZone: "Asia/Kolkata" },
  handler: prizeRevealReminderHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "256MiB", maxInstances: 1 },
});

export const bundleStockSync = defineFunction({
  name: "bundleStockSync",
  description: "Flip bundle isSold when any item runs OOS (daily 10:05 IST).",
  trigger: { kind: "schedule", cron: "5 10 * * *", timeZone: "Asia/Kolkata" },
  handler: bundleStockSyncHandler,
  options: { region: REGION, timeoutSeconds: 540, memory: "256MiB", maxInstances: 1 },
});

export const SCHEDULED_FUNCTIONS = [
  auctionSettlement,
  pendingOrderTimeout,
  couponExpiry,
  offerExpiry,
  productStatsSync,
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
  prizeRevealOpen,
  prizeRevealClose,
  prizeRevealExpiry,
  prizeRevealReminder,
  bundleStockSync,
] as const;
