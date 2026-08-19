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
  // SB1-L (S7-PrizeDraws) — prize-draw reveal redesigned to a fully-automatic model.
  onPrizeDrawPaymentConfirmedHandler,
  prizeDrawSoldOutRevealHandler,
  prizeDrawExpiryRevealHandler,
  bundleStockSyncHandler,
  // SB-UNI-V — Firestore onWrite trigger for product stock changes.
  onProductStockChangeHandler,
  triggerEventRaffleHandler,
  assignSpinPrizeHandler,
  // SB-UNI-Y-1 — daily draft prune for store form drafts
  draftPruneHandler,
  // BAN9 — support ticket lifecycle + ban audit trail
  onSupportTicketCreateHandler,
  onSupportTicketUpdateHandler,
  onUserBanChangeHandler,
  // SCAM8 — scam report notifications
  onScamReportCreateHandler,
  onScamReportUpdateHandler,
  // Firebase binder adapter
  bindSchedule,
  bindDocumentWritten,
  bindDocumentCreated,
  bindDocumentUpdated,
  bindCallable,
  bindHttps,
  bindToFirebase,
} from "./_internal/server/jobs/index.js";

// Function registry (Track A) — typed declarative manifest of every appkit
// Firebase function. Consumers extend by passing a second registry to
// mergeFunctionRegistries(...) and binding the result with
// bindAllFromRegistry(...).
export {
  defineFunction,
  mergeFunctionRegistries,
  bindAllFromRegistry,
  APPKIT_FUNCTIONS,
  APPKIT_FUNCTIONS_BY_NAME,
} from "./_internal/server/functions/index.js";

// Narrow repository re-export for consumer Firebase Functions (e.g. invoice
// PDF generation) — imports directly from the repositories barrel rather
// than `index.ts`/`server.ts`, whose much broader module graphs pull in
// Next.js OG-rendering code that fails to bundle under tsup/esbuild's CJS
// output for the Functions runtime.
export { orderRepository, siteSettingsRepository } from "./repositories/index.js";
export type { OrderDocument, OrderDocumentItem } from "./features/orders/index.js";

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

export type {
  DocumentCreatedTrigger,
  DocumentTriggerFunctionDefinition,
  DocumentUpdatedTrigger,
  DocumentWrittenTrigger,
  FunctionDefinition,
  FunctionMemory,
  FunctionOptions,
  FunctionTrigger,
  HttpsFunctionDefinition,
  HttpsTrigger,
  ScheduledFunctionDefinition,
  ScheduleTrigger,
} from "./_internal/server/functions/index.js";
