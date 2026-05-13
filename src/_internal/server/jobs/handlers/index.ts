/**
 * Job handlers barrel — pure handler functions ready to be bound by an
 * adapter (Firebase Functions, local cron, etc.).
 *
 * S4 batch 1: promotions, onOrderCreate, onOrderStatusChange,
 *             auctionSettlement, autoPayoutEligibility, couponExpiry, offerExpiry
 * S5 batch 2: onReviewWrite, onBidPlaced, cartPrune, notificationPrune,
 *             dailyDataCleanup, countersReconcile, cleanupRtdbEvents
 */

export { couponExpiryHandler } from "./couponExpiry";
export { offerExpiryHandler } from "./offerExpiry";
export { cartPruneHandler } from "./cartPrune";
export { notificationPruneHandler } from "./notificationPrune";
export { dailyDataCleanupHandler } from "./dailyDataCleanup";
export { cleanupRtdbEventsHandler } from "./cleanupRtdbEvents";
export { auctionSettlementHandler } from "./auctionSettlement";
export { autoPayoutEligibilityHandler } from "./autoPayoutEligibility";
export { countersReconcileHandler } from "./countersReconcile";
export { onOrderCreateHandler } from "./onOrderCreate";
export { onOrderStatusChangeHandler } from "./onOrderStatusChange";
export { onBidPlacedHandler } from "./onBidPlaced";
export { onReviewWriteHandler } from "./onReviewWrite";
export { promotionsHandler, type PromotionsCallableResult } from "./promotions";
export { mediaTmpCleanupHandler } from "./mediaTmpCleanup";
export { pendingOrderTimeoutHandler } from "./pendingOrderTimeout";
export { productStatsSyncHandler } from "./productStatsSync";
export { positionsReconcileHandler } from "./positionsReconcile";
export { payoutBatchHandler } from "./payoutBatch";
export { weeklyPayoutEligibilityHandler } from "./weeklyPayoutEligibility";
export { onCategoryWriteHandler } from "./onCategoryWrite";
export { onProductWriteHandler } from "./onProductWrite";
export { onStoreWriteHandler } from "./onStoreWrite";
export { adminAnalyticsHandler, type AdminAnalyticsResult } from "./adminAnalytics";
export {
  storeAnalyticsHandler,
  type StoreAnalyticsInput,
  type StoreAnalyticsResult,
} from "./storeAnalytics";
export {
  listingProcessorHandler,
  supportedListingCollections,
  type ListingRequestBody,
  type ListingResponseBody,
} from "./listingProcessor";

// SB1-L (S7-PrizeDraws) — 7 functions covering prize draws, bundle sync,
// event raffles, and spin-the-wheel.
export { prizeRevealOpenHandler } from "./prizeRevealOpen";
export { prizeRevealCloseHandler } from "./prizeRevealClose";
export { prizeRevealExpiryHandler } from "./prizeRevealExpiry";
export { prizeRevealReminderHandler } from "./prizeRevealReminder";
export { bundleStockSyncHandler } from "./bundleStockSync";
// SB-UNI-V — Firestore onWrite trigger for product stock changes (recomputes
// bundleStockStatus on categoryType:"bundle" rows + activeMemberCount on
// groupedListings).
export { onProductStockChangeHandler } from "./onProductStockChange";
export { triggerEventRaffleHandler } from "./triggerEventRaffle";
export { assignSpinPrizeHandler } from "./assignSpinPrize";
