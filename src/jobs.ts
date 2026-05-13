/**
 * `@mohasinac/appkit/jobs` — Firebase Functions binders + job handlers.
 *
 * Carved out of `server-entry.ts` 2026-05-12 because the import chain reaches
 * `firebase-functions/v2/{https,scheduler,firestore}`, which is only
 * available in the Firebase Functions runtime — not in Vercel Next.js
 * lambdas. Re-exporting these from the main server surface forced every
 * consumer (including the letitrip Next app) to install `firebase-functions`
 * as a dep just to get past `next build`.
 *
 * Now: only the `appkit/functions/` package imports this subpath. The
 * letitrip Next app never reaches `firebase-functions` because it's not in
 * any of the chains rooted at `@mohasinac/appkit` or
 * `@mohasinac/appkit/server`.
 *
 * Usage (functions/src/index.ts):
 *   import {
 *     bindToFirebase,
 *     couponExpiryHandler,
 *     listingProcessorHandler,
 *   } from "@mohasinac/appkit/jobs";
 */

export {
  // S4–S5: Job handlers (pure, framework-agnostic)
  couponExpiryHandler,
  offerExpiryHandler,
  cartPruneHandler,
  notificationPruneHandler,
  dailyDataCleanupHandler,
  cleanupRtdbEventsHandler,
  auctionSettlementHandler,
  autoPayoutEligibilityHandler,
  countersReconcileHandler,
  onOrderCreateHandler,
  onOrderStatusChangeHandler,
  onBidPlacedHandler,
  onReviewWriteHandler,
  promotionsHandler,
  mediaTmpCleanupHandler,
  pendingOrderTimeoutHandler,
  productStatsSyncHandler,
  positionsReconcileHandler,
  payoutBatchHandler,
  weeklyPayoutEligibilityHandler,
  onCategoryWriteHandler,
  onProductWriteHandler,
  onStoreWriteHandler,
  adminAnalyticsHandler,
  storeAnalyticsHandler,
  listingProcessorHandler,
  supportedListingCollections,
  // SB1-L (S7-PrizeDraws)
  prizeRevealOpenHandler,
  prizeRevealCloseHandler,
  prizeRevealExpiryHandler,
  prizeRevealReminderHandler,
  bundleStockSyncHandler,
  triggerEventRaffleHandler,
  assignSpinPrizeHandler,
  // Firebase binder adapter
  bindSchedule,
  bindDocumentWritten,
  bindDocumentCreated,
  bindDocumentUpdated,
  bindCallable,
  bindHttps,
  bindToFirebase,
} from "./_internal/server/jobs/index.js";

export type {
  PromotionsCallableResult,
  AdminAnalyticsResult,
  StoreAnalyticsInput,
  StoreAnalyticsResult,
  ListingRequestBody,
  ListingResponseBody,
  JobContext,
  JobLogger,
  JobHandlers,
  ScheduleHandler,
  FirestoreTriggerHandler,
  FirestoreTriggerEvent,
  CallableHandler,
  BindHttpsOptions,
} from "./_internal/server/jobs/index.js";
