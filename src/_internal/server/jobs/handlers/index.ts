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
export { onJobCreatedHandler } from "./onJobCreated";
export { onReviewWriteHandler } from "./onReviewWrite";
export { promotionsHandler, type PromotionsCallableResult } from "./promotions";
export { mediaTmpCleanupHandler } from "./mediaTmpCleanup";
export { pendingOrderTimeoutHandler } from "./pendingOrderTimeout";
export { paymentWindowTimeoutHandler } from "./paymentWindowTimeout";
export { hardBanReinstatementHandler } from "./hardBanReinstatement";
export { paymentReviewAutoApproveHandler } from "./paymentReviewAutoApprove";
export { productStatsSyncHandler } from "./productStatsSync";
export { revenueRollupHandler } from "./revenueRollup";
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

// SB1-L (S7-PrizeDraws) — bundle sync, event raffles, and spin-the-wheel.
// Prize-draw reveal itself was redesigned to a fully-automatic model — see
// prizeDrawAssignWinner.ts (shared core), onPrizeDrawPaymentConfirmed
// (instant mode), prizeDrawSoldOutReveal (scheduled mode, sellout half), and
// prizeDrawExpiryReveal (scheduled mode, expiry half) below.
export { bundleStockSyncHandler } from "./bundleStockSync";
export { onPrizeDrawPaymentConfirmedHandler } from "./onPrizeDrawPaymentConfirmed";
export { prizeDrawSoldOutRevealHandler } from "./prizeDrawSoldOutReveal";
export { prizeDrawExpiryRevealHandler } from "./prizeDrawExpiryReveal";
// SB-UNI-V — Firestore onWrite trigger for product stock changes (recomputes
// bundleStockStatus on categoryType:"bundle" rows + activeMemberCount on
// groupedListings).
export { onProductStockChangeHandler } from "./onProductStockChange";
export { triggerEventRaffleHandler } from "./triggerEventRaffle";
export { assignSpinPrizeHandler } from "./assignSpinPrize";
// BAN9 — support ticket lifecycle + user ban audit
export { onSupportTicketCreateHandler } from "./onSupportTicketCreate";
export { onSupportTicketUpdateHandler } from "./onSupportTicketUpdate";
export { onUserBanChangeHandler } from "./onUserBanChange";
// SCAM8 — scam report notifications
export { onScamReportCreateHandler } from "./onScamReportCreate";
export { onScamReportUpdateHandler } from "./onScamReportUpdate";
// SB-UNI-Y-1 — 30-day draft prune
export { draftPruneHandler } from "./draftPrune";
// Tester program — 7-day auto-expiry sweep for the shared admin-seeded test sandbox
export { testerSandboxCleanupHandler } from "./testerSandboxCleanup";
// EMI — installment reminder + overdue-flagging sweep
export { emiInstallmentReminderHandler } from "./emiInstallmentReminder";
// Procurement Shipments — 3-function recompute cascade (item→lot, lot/header→shipment allocation, cascade-delete)
export { onShipmentItemWriteHandler } from "./onShipmentItemWrite";
export { onShipmentLotWriteHandler, onShipmentHeaderWriteHandler } from "./onShipmentAllocationSync";
export { onShipmentDeletedHandler } from "./onShipmentDeleted";
// Personal Catalogue (Feature B) — freshness reminder + admin approval-request notification
export { catalogueImageStalenessReminderHandler } from "./catalogueImageStalenessReminder";
export { onCatalogueSubmittedForApprovalHandler } from "./onCatalogueSubmittedForApproval";
