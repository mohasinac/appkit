/**
 * Pure job-core functions — no Firebase Functions trigger types, no event
 * envelope. Call any of these from an API route, server action, script,
 * Vitest test, or another runtime by passing a `JobContext`.
 *
 * The matching `handlers/<name>.ts` wrappers add Firebase Functions trigger
 * typing (ScheduleHandler / FirestoreTriggerHandler / CallableHandler) and
 * unwrap the Firestore event envelope — that's the only Firebase-specific
 * layer. Wire those into `functions/src/index.ts` via `bindToFirebase.*`.
 */

// Schedule jobs
export { runCouponExpiry } from "./couponExpiry";
export { runOfferExpiry } from "./offerExpiry";
export { runCartPrune } from "./cartPrune";
export { runNotificationPrune } from "./notificationPrune";
export { runDailyDataCleanup } from "./dailyDataCleanup";
export { runCleanupRtdbEvents } from "./cleanupRtdbEvents";
export { runMediaTmpCleanup } from "./mediaTmpCleanup";
export { runPendingOrderTimeout } from "./pendingOrderTimeout";
export { runCountersReconcile } from "./countersReconcile";
export { runBundleStockSync } from "./bundleStockSync";
export { runPayoutBatch } from "./payoutBatch";
export { runAutoPayoutEligibility } from "./autoPayoutEligibility";
export { runProductStatsSync } from "./productStatsSync";
export { runPositionsReconcile } from "./positionsReconcile";
export {
  runWeeklyPayoutEligibility,
  type WeeklyPayoutEligibilityResult,
} from "./weeklyPayoutEligibility";
export { runHardBanCascade } from "./hardBanCascade";
export {
  JOB_RUNNERS,
  type JobRunner,
  type JobRunResult,
} from "./jobRunners";
export { runAuctionSettlement } from "./auctionSettlement";
export { assignPrizeDrawWinner, type AssignPrizeDrawWinnerResult } from "./prizeDrawAssignWinner";
export { handlePrizeDrawPaymentConfirmed } from "./onPrizeDrawPaymentConfirmed";
export { handlePrizeDrawSoldOut } from "./prizeDrawSoldOutReveal";
export { runPrizeDrawExpiryReveal } from "./prizeDrawExpiryReveal";

// Callables
export { runPromotions, type PromotionsCallableResult } from "./promotions";
export {
  runListingProcessor,
  supportedListingCollections,
  type ListingRequestBody,
  type ListingResponseBody,
} from "./listingProcessor";
export {
  runStoreAnalytics,
  type StoreAnalyticsInput,
  type StoreAnalyticsResult,
} from "./storeAnalytics";
export { runAdminAnalytics, type AdminAnalyticsResult } from "./adminAnalytics";
export {
  runTriggerEventRaffle,
  type TriggerEventRaffleInput,
  type TriggerEventRaffleResult,
} from "./triggerEventRaffle";
export {
  runAssignSpinPrize,
  type AssignSpinPrizeInput,
  type AssignSpinPrizeResult,
} from "./assignSpinPrize";

// Trigger reactors — call with the meaningful payload, no Firestore event needed
export { handleBidPlaced, type HandleBidPlacedInput, type NewBid } from "./onBidPlaced";
export {
  handleOrderCreate,
  type HandleOrderCreateInput,
  type NewOrder,
} from "./onOrderCreate";
export {
  handleOrderStatusChange,
  type HandleOrderStatusChangeInput,
  type OrderAfter,
  type OrderBefore,
} from "./onOrderStatusChange";
export {
  handleProductWrite,
  type HandleProductWriteInput,
  type ProductDoc,
} from "./onProductWrite";
export {
  handleProductStockChange,
  type HandleProductStockChangeInput,
  syncBundlesForProduct,
  syncGroupedListingsForProduct,
  isAvailable,
} from "./onProductStockChange";
export { handleReviewWrite, type HandleReviewWriteInput } from "./onReviewWrite";
export {
  handleCategoryWrite,
  type HandleCategoryWriteInput,
  type CategoryDoc,
} from "./onCategoryWrite";
export {
  handleStoreWrite,
  type HandleStoreWriteInput,
  type StoreDoc,
} from "./onStoreWrite";
export { handleJobCreated, type HandleJobCreatedInput } from "./onJobCreated";
