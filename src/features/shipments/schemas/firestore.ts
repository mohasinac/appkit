/**
 * Procurement Shipments Firestore Document Types & Constants
 *
 * Three top-level collections (not embedded arrays — a lot can hold up to
 * ~500 items and a shipment up to ~10 lots, which blows past Firestore's
 * 1 MiB document limit if nested):
 *   procurementShipments — header + overall totals (persisted rollup)
 *   shipmentLots          — one doc per lot, FK shipmentId
 *   shipmentItems         — one doc per individually-tracked "main" item, FK lotId/shipmentId
 *
 * Totals are recomputed by a background Firestore-triggered Function
 * cascade (see appkit/src/_internal/server/functions/firestore/on-shipment-*),
 * never inline in a Vercel route or React component.
 */

import {
  generateShipmentId,
  type GenerateShipmentIdInput,
} from "../../../utils/id-generators";
import type { StatusChangeEntry } from "../../../_internal/shared/history/types";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { MediaField } from "../../media/types";
import type { ListingType } from "../../products/types";
import type { ProductDocument } from "../../products/schemas/firestore";

export const SHIPMENT_COLLECTION = "procurementShipments" as const;
export const SHIPMENT_LOT_COLLECTION = "shipmentLots" as const;
export const SHIPMENT_ITEM_COLLECTION = "shipmentItems" as const;

export type ShipmentStatus =
  | "planning"
  | "ordered"
  | "in_transit"
  | "customs"
  | "received"
  | "processing"
  | "completed"
  | "cancelled";

// Hard scale caps (architectural — 500 is Firestore's native batched-write limit).
export const MAX_ITEMS_PER_LOT = 500;
export const MAX_LOTS_PER_SHIPMENT = 10;

export interface ShipmentTotals {
  lotsCost: number;
  customsTotal: number;
  shippingTotal: number;
  laborCost: number;
  totalShipmentCost: number;
  totalProjectedRevenue: number;
  projectedProfit: number;
  projectedProfitAfterLabor: number;
  projectedMarginPercent: number;
  projectedRoiPercent: number;
  totalWeightGrams: number;
  totalItemCount: number;
  lotCount: number;
  estimatedProcessingDays: number;
}

export const DEFAULT_SHIPMENT_TOTALS: ShipmentTotals = {
  lotsCost: 0,
  customsTotal: 0,
  shippingTotal: 0,
  laborCost: 0,
  totalShipmentCost: 0,
  totalProjectedRevenue: 0,
  projectedProfit: 0,
  projectedProfitAfterLabor: 0,
  projectedMarginPercent: 0,
  projectedRoiPercent: 0,
  totalWeightGrams: 0,
  totalItemCount: 0,
  lotCount: 0,
  estimatedProcessingDays: 0,
};

export interface ShipmentDocument extends BaseDocument {
  shipmentNumber: string;
  supplierName: string;
  originCountry?: string;
  status: ShipmentStatus;
  trackingNumber?: string;
  carrier?: string;
  etaDate?: Date;
  receivedDate?: Date;
  notes?: string;

  customsTotal: number;
  shippingTotal: number;
  laborHoursSpent?: number;
  laborRatePerHour?: number;

  // Persisted rollup — written only by the Function cascade. Never computed
  // inline at read time; compare totalsComputedAt vs updatedAt for a
  // "recalculating…" indicator in the UI.
  totals: ShipmentTotals;
  totalsComputedAt?: Date;

  createdBy: string;

  /** Who changed what, when, and why. See § "Status History" in CLAUDE.md. */
  statusHistory?: StatusChangeEntry[];
  statusHistoryTruncated?: number;
}

export interface ShipmentLot extends BaseDocument {
  shipmentId: string;
  shipmentStatus: ShipmentStatus; // denormalized, kept in sync by the Function cascade
  lotName: string;
  supplierOrderRef?: string;
  weightGrams: number;
  purchaseCost: number;
  images: MediaField[];

  // "Main items" tracking — only individually notable items get a
  // shipmentItems doc; everything else is this lump estimate.
  remainderItemCount?: number;
  remainderEstimatedValue?: number;

  // Recomputed by the item-write trigger —
  itemCount: number;
  mainItemsProjectedRevenue: number;

  // Recomputed by the lot/shipment allocation trigger —
  customsAllocated: number;
  shippingAllocated: number;
  totalLandedCost: number;
  projectedRevenue: number;
  projectedProfit: number;
}

/**
 * Reused everywhere a "this will eventually become a real product" record is
 * needed (ShipmentItem below, and Feature B's CatalogueItemDocument) — a
 * Pick off the live ProductDocument, not a hand-duplicated field list, so
 * (a) the eventual product-creation call is close to a literal field spread,
 * and (b) a future ProductDocument field rename surfaces as a type error
 * here instead of silently drifting.
 */
export type ProductDraftFields = Pick<
  ProductDocument,
  "title" | "mainImage" | "images" | "condition" | "categorySlugs" | "brandSlug" | "price"
>;

export interface ShipmentItem
  extends BaseDocument,
    Partial<Omit<ProductDraftFields, "title">> {
  shipmentId: string;
  lotId: string;
  title: string; // required — reused product field name
  quantity: number;
  isForSelfUse: boolean;
  // `price` (decimal rupees, from ProductDraftFields, optional via Partial)
  // plays the "projected sale price" role — required unless isForSelfUse (Zod refine).
  notes?: string;
  // Nullable (not just optional) so an unlink write can explicitly clear the
  // field — Firestore writes with `undefined` are stripped before they ever
  // reach the document (see prepareForFirestore), so clearing requires `null`.
  linkedProductId?: string | null;
  linkedProductSlug?: string | null;
  linkedProductListingType?: ListingType | null;
}

export const SHIPMENT_STATUS_VALUES = {
  PLANNING: "planning",
  ORDERED: "ordered",
  IN_TRANSIT: "in_transit",
  CUSTOMS: "customs",
  RECEIVED: "received",
  PROCESSING: "processing",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const satisfies Record<string, ShipmentStatus>;

export const SHIPMENT_FIELDS = {
  ID: "id",
  SHIPMENT_NUMBER: "shipmentNumber",
  STATUS: "status",
  ETA_DATE: "etaDate",
  CREATED_AT: "createdAt",
  STATUS_VALUES: SHIPMENT_STATUS_VALUES,
} as const;

export const SHIPMENT_LOT_FIELDS = {
  ID: "id",
  SHIPMENT_ID: "shipmentId",
  SHIPMENT_STATUS: "shipmentStatus",
  PROJECTED_PROFIT: "projectedProfit",
  CREATED_AT: "createdAt",
} as const;

export const SHIPMENT_ITEM_FIELDS = {
  ID: "id",
  SHIPMENT_ID: "shipmentId",
  LOT_ID: "lotId",
  LINKED_PRODUCT_ID: "linkedProductId",
  CREATED_AT: "createdAt",
} as const;

export type ShipmentCreateInput = Omit<
  ShipmentDocument,
  "id" | "createdAt" | "updatedAt" | "totals" | "totalsComputedAt"
>;
export type ShipmentUpdateInput = Partial<
  Omit<ShipmentDocument, "id" | "createdAt" | "createdBy" | "totals" | "totalsComputedAt">
>;

export type ShipmentLotCreateInput = Omit<
  ShipmentLot,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "shipmentId"
  | "shipmentStatus"
  | "itemCount"
  | "mainItemsProjectedRevenue"
  | "customsAllocated"
  | "shippingAllocated"
  | "totalLandedCost"
  | "projectedRevenue"
  | "projectedProfit"
>;
export type ShipmentLotUpdateInput = Partial<
  Omit<ShipmentLot, "id" | "createdAt" | "shipmentId">
>;

export type ShipmentItemCreateInput = Omit<ShipmentItem, "id" | "createdAt" | "updatedAt" | "shipmentId" | "lotId">;
export type ShipmentItemUpdateInput = Partial<
  Omit<ShipmentItem, "id" | "createdAt" | "shipmentId" | "lotId">
>;

export const shipmentQueryHelpers = {
  byStatus: (status: ShipmentStatus) => ["status", "==", status] as const,
  notCancelled: () => ["status", "!=", "cancelled" as ShipmentStatus] as const,
} as const;

export function createShipmentId(input: GenerateShipmentIdInput): string {
  return generateShipmentId(input);
}


/**
 * The fields whose changes earn a timeline entry.
 *
 * A procurement shipment's dates ARE its status for practical purposes — "ETA
 * slipped twice before it landed" is the question this answers, and each slip
 * overwrites the previous `etaDate`.
 */
export const SHIPMENT_TRACKED_FIELDS = [
  "status",
  "etaDate",
  "receivedDate",
  "trackingNumber",
] as const;

/** PII on this document, for `withHistory`'s scrub. */
export const SHIPMENT_HISTORY_PII_FIELDS = [
  "supplierEmail",
  "supplierPhone",
  "contactName",
] as const;
