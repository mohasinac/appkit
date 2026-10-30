// --- Types --------------------------------------------------------------------
export type {
  JobContext,
  JobResult,
  ScheduledJobFn,
  PubSubJobFn,
  CronJobDefinition,
  CreateCronJobOptions,
  CronRegistry,
  CronRegistrySummary,
} from "./types";

// --- Registry -----------------------------------------------------------------
export {
  createCronJob,
  getCronRegistry,
  getCronRegistrySummary,
  findCronJob,
  runJob,
  _resetCronRegistry,
} from "./registry";

// --- Firebase adapters --------------------------------------------------------
export { wrapScheduled, wrapPubSub } from "./firebase-adapters";

// --- Built-in jobs ------------------------------------------------------------
/*
 * 🛑 `createAuctionExpiryJob` was DELETED in the collector-drop rename, not
 * renamed. It was generic library scaffolding with its own local
 * `AuctionDocument` shape over a `getRepository("auctions")` collection that
 * does not exist in this project, and ZERO consumers outside this barrel —
 * real collector-drop settlement is `collectorDropSettlement` in
 * `_internal/server/functions/scheduled.ts`. Renaming it would have produced a
 * `CollectorDropDocument` matching nothing (no-speculative-infra rule).
 */
export { createPreOrderReminderJob } from "./jobs/preorder-reminder.job";
