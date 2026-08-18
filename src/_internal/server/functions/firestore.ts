/**
 * Firestore document-trigger function definitions.
 *
 * Each entry uses the pure handler from
 * `appkit/src/_internal/server/jobs/handlers/`.
 * The path patterns mirror the original `functions/src/index.ts` declarations
 * to preserve identical deploy behavior.
 */

import {
  onBidPlacedHandler,
  onCategoryWriteHandler,
  onOrderCreateHandler,
  onOrderStatusChangeHandler,
  onProductStockChangeHandler,
  onProductWriteHandler,
  onReviewWriteHandler,
  onScamReportCreateHandler,
  onScamReportUpdateHandler,
  onStoreWriteHandler,
  onSupportTicketCreateHandler,
  onSupportTicketUpdateHandler,
  onUserBanChangeHandler,
  onShipmentItemWriteHandler,
  onShipmentLotWriteHandler,
  onShipmentHeaderWriteHandler,
  onShipmentDeletedHandler,
  onCatalogueSubmittedForApprovalHandler,
  onJobCreatedHandler,
} from "../jobs/handlers";
import { defineFunction } from "./define";

const REGION = "asia-south1";

export const onBidPlaced = defineFunction({
  name: "onBidPlaced",
  description: "Side-effects on bid creation (notifications, outbid emails).",
  trigger: { kind: "documentCreated", pathPattern: "bids/{bidId}" },
  handler: onBidPlacedHandler,
  options: { region: REGION },
});

export const onOrderCreate = defineFunction({
  name: "onOrderCreate",
  description: "Side-effects on order creation (notify store, decrement stock).",
  trigger: { kind: "documentCreated", pathPattern: "orders/{orderId}" },
  handler: onOrderCreateHandler,
  options: { region: REGION },
});

export const onOrderStatusChange = defineFunction({
  name: "onOrderStatusChange",
  description: "Side-effects on order status transitions (buyer notifications, returns).",
  trigger: { kind: "documentUpdated", pathPattern: "orders/{orderId}" },
  handler: onOrderStatusChangeHandler,
  options: { region: REGION },
});

export const onProductWrite = defineFunction({
  name: "onProductWrite",
  description: "Side-effects on any product write (search index, stats, audits).",
  trigger: { kind: "documentWritten", pathPattern: "products/{productId}" },
  handler: onProductWriteHandler,
  options: { region: REGION },
});

export const onProductStockChange = defineFunction({
  name: "onProductStockChange",
  description: "Recompute bundleStockStatus + groupedListing activeMemberCount when stock changes.",
  trigger: { kind: "documentWritten", pathPattern: "products/{productId}" },
  handler: onProductStockChangeHandler,
  options: { region: REGION },
});

export const onReviewWrite = defineFunction({
  name: "onReviewWrite",
  description: "Recompute product + store rating aggregates on review writes.",
  trigger: { kind: "documentWritten", pathPattern: "reviews/{reviewId}" },
  handler: onReviewWriteHandler,
  options: { region: REGION },
});

export const onCategoryWrite = defineFunction({
  name: "onCategoryWrite",
  description: "Side-effects on category writes (path materialization, slug indexes).",
  trigger: { kind: "documentWritten", pathPattern: "categories/{categoryId}" },
  handler: onCategoryWriteHandler,
  options: { region: REGION },
});

export const onStoreWrite = defineFunction({
  name: "onStoreWrite",
  description: "Side-effects on store writes (status mirror, owner uid index).",
  trigger: { kind: "documentWritten", pathPattern: "stores/{storeId}" },
  handler: onStoreWriteHandler,
  options: { region: REGION },
});

export const onSupportTicketCreate = defineFunction({
  name: "onSupportTicketCreate",
  description: "Confirm ticket to reporter + queue for routing.",
  trigger: { kind: "documentCreated", pathPattern: "supportTickets/{ticketId}" },
  handler: onSupportTicketCreateHandler,
  options: { region: REGION },
});

export const onSupportTicketUpdate = defineFunction({
  name: "onSupportTicketUpdate",
  description: "Notify reporter on status changes (resolved / closed / waiting).",
  trigger: { kind: "documentUpdated", pathPattern: "supportTickets/{ticketId}" },
  handler: onSupportTicketUpdateHandler,
  options: { region: REGION },
});

export const onUserBanChange = defineFunction({
  name: "onUserBanChange",
  description: "Append ban-history audit entries on banned/disabled changes.",
  trigger: { kind: "documentUpdated", pathPattern: "users/{uid}" },
  handler: onUserBanChangeHandler,
  options: { region: REGION },
});

export const onScamReportCreate = defineFunction({
  name: "onScamReportCreate",
  description: "Notify reporter + employees with scammer read permission on new reports.",
  trigger: { kind: "documentCreated", pathPattern: "scammerProfiles/{scammerId}" },
  handler: onScamReportCreateHandler,
  options: { region: REGION },
});

export const onScamReportUpdate = defineFunction({
  name: "onScamReportUpdate",
  description: "Notify reporter when scam report status flips to verified/rejected.",
  trigger: { kind: "documentUpdated", pathPattern: "scammerProfiles/{scammerId}" },
  handler: onScamReportUpdateHandler,
  options: { region: REGION },
});

// Procurement Shipments — 3-function recompute cascade. See
// onShipmentItemWrite/onShipmentAllocationSync/onShipmentDeleted handler
// files for the full data-flow explanation.
export const onShipmentItemWrite = defineFunction({
  name: "onShipmentItemWrite",
  description: "Recompute a shipment lot's itemCount + mainItemsProjectedRevenue on any item write.",
  trigger: { kind: "documentWritten", pathPattern: "shipmentItems/{itemId}" },
  handler: onShipmentItemWriteHandler,
  options: { region: REGION },
});

export const onShipmentLotWrite = defineFunction({
  name: "onShipmentLotWrite",
  description: "Recompute cross-lot customs/shipping allocation + shipment totals on any lot write.",
  trigger: { kind: "documentWritten", pathPattern: "shipmentLots/{lotId}" },
  handler: onShipmentLotWriteHandler,
  options: { region: REGION },
});

export const onShipmentHeaderWrite = defineFunction({
  name: "onShipmentHeaderWrite",
  description: "Recompute cross-lot allocation when a shipment's customs/shipping/labor/status fields change.",
  trigger: { kind: "documentWritten", pathPattern: "procurementShipments/{shipmentId}" },
  handler: onShipmentHeaderWriteHandler,
  options: { region: REGION },
});

export const onShipmentDeleted = defineFunction({
  name: "onShipmentDeleted",
  description: "Cascade-delete a shipment's lots + items in batches of 500 (bound as documentWritten; handler checks for deletion).",
  trigger: { kind: "documentWritten", pathPattern: "procurementShipments/{shipmentId}" },
  handler: onShipmentDeletedHandler,
  options: { region: REGION },
});

export const onCatalogueSubmittedForApproval = defineFunction({
  name: "onCatalogueSubmittedForApproval",
  description: "Notify all admins when a catalogue item's listingStatus transitions to pending_admin_approval.",
  trigger: { kind: "documentUpdated", pathPattern: "catalogueItems/{itemId}" },
  handler: onCatalogueSubmittedForApprovalHandler,
  options: { region: REGION },
});

// Async job primitive — Vercel routes write a lightweight `jobs/{jobId}` doc
// via `enqueueJob()` and return immediately; this Function does the actual
// processing (CLAUDE.md Rule #6). Longer timeout/memory than the other
// triggers since job runners (e.g. hardBanCascade, payoutsWeekly) do real work.
export const onJobCreated = defineFunction({
  name: "onJobCreated",
  description: "Dispatch a jobs/{jobId} doc to its JOB_RUNNERS entry and report the result via bulk_events RTDB.",
  trigger: { kind: "documentCreated", pathPattern: "jobs/{jobId}" },
  handler: onJobCreatedHandler,
  options: { region: REGION, timeoutSeconds: 300, memory: "512MiB" },
});

export const FIRESTORE_TRIGGER_FUNCTIONS = [
  onBidPlaced,
  onOrderCreate,
  onOrderStatusChange,
  onProductWrite,
  onProductStockChange,
  onReviewWrite,
  onCategoryWrite,
  onStoreWrite,
  onSupportTicketCreate,
  onSupportTicketUpdate,
  onUserBanChange,
  onScamReportCreate,
  onScamReportUpdate,
  onShipmentItemWrite,
  onShipmentLotWrite,
  onShipmentHeaderWrite,
  onShipmentDeleted,
  onCatalogueSubmittedForApproval,
  onJobCreated,
] as const;
