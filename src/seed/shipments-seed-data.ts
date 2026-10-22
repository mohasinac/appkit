/*
 * WHY: Procurement shipment fixtures. Production has none, so this is empty.
 * WHAT: Empty across all three collections (procurementShipments /
 * shipmentLots / shipmentItems). `allocateShipmentCosts()` and the derivation
 * below are kept — they are the real logic, and mapping nothing costs nothing.
 *
 * 🛑 PRUNED TO MATCH LIVE, 2026-10-22 — the second pass, which caught what the
 * first missed. The rows here were GENERATED (a `.push()` loop, a spread of a
 * generator call, or a factory call with a template-literal id), so a static
 * scan of the array literal read `0` while the loader wrote dozens. The only
 * authority on what a load writes is `npx appkit-seed load --dry-run`.
 *
 * Consequence, recorded rather than left to be discovered: tester cases that
 * acted on this data can now only report "could not test".
 *
 * EXPORTS:
 *   shipmentsSeedData     — Array of Partial<ShipmentDocument>
 *   shipmentLotsSeedData  — Array of Partial<ShipmentLot>
 *   shipmentItemsSeedData — Array of Partial<ShipmentItem>
 */

import type { ShipmentDocument, ShipmentLot, ShipmentItem, ShipmentStatus } from "../features/shipments/schemas/firestore";
import { allocateShipmentCosts, type LotAllocationInput } from "../features/shipments/utils/cost-allocation";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const SEED_LABOR_RATE_PER_HOUR = 200; // ₹200/hr
const SEED_MAX_HOURS_PER_DAY = 4;

interface RawItem {
  id: string;
  lotId: string;
  shipmentId: string;
  title: string;
  quantity: number;
  isForSelfUse: boolean;
  price?: number;
  linkedProductId?: string;
  linkedProductSlug?: string;
  linkedProductListingType?: string;
}

interface RawLot {
  id: string;
  shipmentId: string;
  lotName: string;
  supplierOrderRef: string;
  weightGrams: number;
  purchaseCost: number;
  remainderItemCount?: number;
  remainderEstimatedValue?: number;
}

interface RawShipment {
  id: string;
  shipmentNumber: string;
  supplierName: string;
  originCountry: string;
  status: ShipmentStatus;
  trackingNumber?: string;
  carrier?: string;
  etaDate: Date;
  receivedDate?: Date;
  notes?: string;
  customsTotal: number;
  shippingTotal: number;
  laborHoursSpent: number;
}

const rawShipments: RawShipment[] = [];

const rawLots: RawLot[] = [];

const rawItems: RawItem[] = [];

function mainItemsRevenue(lotId: string): number {
  return rawItems
    .filter((item) => item.lotId === lotId)
    .reduce((sum, item) => (item.isForSelfUse ? sum : sum + (item.price ?? 0) * item.quantity), 0);
}

// ── Compute persisted totals per shipment (Function-cascade equivalent, at build time) ──

const shipmentLotsSeedData: Partial<ShipmentLot>[] = [];
const shipmentsSeedData: Partial<ShipmentDocument>[] = [];

for (const shipment of rawShipments) {
  const lotsForShipment = rawLots.filter((lot) => lot.shipmentId === shipment.id);

  const allocationInputs: LotAllocationInput[] = lotsForShipment.map((lot) => ({
    id: lot.id,
    purchaseCost: lot.purchaseCost,
    weightGrams: lot.weightGrams,
    mainItemsProjectedRevenue: mainItemsRevenue(lot.id),
    remainderEstimatedValue: lot.remainderEstimatedValue,
    itemCount: rawItems.filter((item) => item.lotId === lot.id).length,
  }));

  const { perLot, totals } = allocateShipmentCosts({
    lots: allocationInputs,
    customsTotal: shipment.customsTotal,
    shippingTotal: shipment.shippingTotal,
    laborHoursSpent: shipment.laborHoursSpent,
    laborRatePerHour: SEED_LABOR_RATE_PER_HOUR,
    maxHoursPerDay: SEED_MAX_HOURS_PER_DAY,
  });

  for (const lot of lotsForShipment) {
    const computed = perLot[lot.id];
    shipmentLotsSeedData.push({
      id: lot.id,
      shipmentId: lot.shipmentId,
      shipmentStatus: shipment.status,
      lotName: lot.lotName,
      supplierOrderRef: lot.supplierOrderRef,
      weightGrams: lot.weightGrams,
      purchaseCost: lot.purchaseCost,
      images: [],
      remainderItemCount: lot.remainderItemCount,
      remainderEstimatedValue: lot.remainderEstimatedValue,
      itemCount: rawItems.filter((item) => item.lotId === lot.id).length,
      mainItemsProjectedRevenue: mainItemsRevenue(lot.id),
      ...computed,
    });
  }

  shipmentsSeedData.push({
    id: shipment.id,
    shipmentNumber: shipment.shipmentNumber,
    supplierName: shipment.supplierName,
    originCountry: shipment.originCountry,
    status: shipment.status,
    trackingNumber: shipment.trackingNumber,
    carrier: shipment.carrier,
    etaDate: shipment.etaDate,
    receivedDate: shipment.receivedDate,
    notes: shipment.notes,
    customsTotal: shipment.customsTotal,
    shippingTotal: shipment.shippingTotal,
    laborHoursSpent: shipment.laborHoursSpent,
    laborRatePerHour: SEED_LABOR_RATE_PER_HOUR,
    totals,
    totalsComputedAt: daysAgo(1),
    createdBy: "user-admin-mohsin-c",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  });
}

const shipmentItemsSeedData: Partial<ShipmentItem>[] = rawItems.map((item) => ({
  id: item.id,
  shipmentId: item.shipmentId,
  lotId: item.lotId,
  title: item.title,
  quantity: item.quantity,
  isForSelfUse: item.isForSelfUse,
  price: item.price,
  linkedProductId: item.linkedProductId,
  linkedProductSlug: item.linkedProductSlug,
  linkedProductListingType: item.linkedProductListingType as ShipmentItem["linkedProductListingType"],
  createdAt: daysAgo(1),
  updatedAt: daysAgo(1),
}));

export { shipmentsSeedData, shipmentLotsSeedData, shipmentItemsSeedData };
