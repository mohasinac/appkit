/*
 * WHY: Seeds the procurement-shipments profit-tracking system across its
 *      three collections (procurementShipments / shipmentLots / shipmentItems).
 *      Totals are pre-computed here via allocateShipmentCosts() since the
 *      seed loader doesn't run the Firestore-triggered Function cascade that
 *      normally computes them (mirrors payouts-seed-data.ts's payoutAmounts()
 *      pre-computation pattern).
 * WHAT: 4 shipments across planning/in_transit/received/completed, each with
 *       2 lots; a handful of individually-tracked "main" items per lot (one
 *       self-use, one pre-linked to a seeded product); one lot exercises the
 *       remainder (untracked bulk) fields.
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
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

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

const rawShipments: RawShipment[] = [
  {
    id: "shipment-tokyo-toys-collectibles-20260615-a1b2c3",
    shipmentNumber: "SH-2026-0001",
    supplierName: "Tokyo Toys Collectibles",
    originCountry: "Japan",
    status: "planning",
    etaDate: daysFromNow(21),
    notes: "Base Set booster boxes + a graded Charizard for the owner's personal collection.",
    customsTotal: 45000,
    shippingTotal: 18000,
    laborHoursSpent: 0,
  },
  {
    id: "shipment-vintage-vault-usa-20260701-d4e5f6",
    shipmentNumber: "SH-2026-0002",
    supplierName: "Vintage Vault USA",
    originCountry: "United States",
    status: "in_transit",
    trackingNumber: "1Z999AA10123456784",
    carrier: "UPS",
    etaDate: daysFromNow(9),
    customsTotal: 30000,
    shippingTotal: 22000,
    laborHoursSpent: 0,
  },
  {
    id: "shipment-gundam-galaxy-hk-20260610-g7h8i9",
    shipmentNumber: "SH-2026-0003",
    supplierName: "Gundam Galaxy HK",
    originCountry: "Hong Kong",
    status: "received",
    trackingNumber: "SF1029384756",
    carrier: "SF Express",
    etaDate: daysAgo(3),
    receivedDate: daysAgo(3),
    customsTotal: 15000,
    shippingTotal: 9000,
    laborHoursSpent: 6,
  },
  {
    id: "shipment-beyblade-arena-cn-20260520-j1k2l3",
    shipmentNumber: "SH-2026-0004",
    supplierName: "Beyblade Arena China",
    originCountry: "China",
    status: "completed",
    trackingNumber: "EE123456789CN",
    carrier: "China Post",
    etaDate: daysAgo(30),
    receivedDate: daysAgo(28),
    customsTotal: 8000,
    shippingTotal: 6000,
    laborHoursSpent: 5,
  },
];

const rawLots: RawLot[] = [
  { id: "lot-tokyo-01", shipmentId: rawShipments[0].id, lotName: "Base Set Booster Boxes", supplierOrderRef: "TTC-88213", weightGrams: 6000, purchaseCost: 450000 },
  { id: "lot-tokyo-02", shipmentId: rawShipments[0].id, lotName: "Charizard PSA 9 — personal", supplierOrderRef: "TTC-88214", weightGrams: 400, purchaseCost: 220000 },

  { id: "lot-vault-01", shipmentId: rawShipments[1].id, lotName: "Redline Hot Wheels lot", supplierOrderRef: "VV-4471", weightGrams: 3200, purchaseCost: 180000 },
  { id: "lot-vault-02", shipmentId: rawShipments[1].id, lotName: "Diecast Trucks lot", supplierOrderRef: "VV-4472", weightGrams: 5400, purchaseCost: 95000, remainderItemCount: 120, remainderEstimatedValue: 360000 },

  { id: "lot-gundam-01", shipmentId: rawShipments[2].id, lotName: "MG Gunpla lot", supplierOrderRef: "GG-9021", weightGrams: 8000, purchaseCost: 120000 },
  { id: "lot-gundam-02", shipmentId: rawShipments[2].id, lotName: "HG Gunpla assorted", supplierOrderRef: "GG-9022", weightGrams: 3000, purchaseCost: 40000 },

  { id: "lot-beyblade-01", shipmentId: rawShipments[3].id, lotName: "Burst Series lot", supplierOrderRef: "BA-3301", weightGrams: 4500, purchaseCost: 60000 },
  { id: "lot-beyblade-02", shipmentId: rawShipments[3].id, lotName: "Launchers + stadiums", supplierOrderRef: "BA-3302", weightGrams: 2200, purchaseCost: 25000 },
];

const rawItems: RawItem[] = [
  { id: "item-tokyo-01a", lotId: "lot-tokyo-01", shipmentId: rawShipments[0].id, title: "Base Set Booster Box (Japanese)", quantity: 6, isForSelfUse: false, price: 95_000 },
  { id: "item-tokyo-02a", lotId: "lot-tokyo-02", shipmentId: rawShipments[0].id, title: "Charizard Base Set PSA 9", quantity: 1, isForSelfUse: true },

  { id: "item-vault-01a", lotId: "lot-vault-01", shipmentId: rawShipments[1].id, title: "Redline Custom Camaro", quantity: 4, isForSelfUse: false, price: 18_000 },
  { id: "item-vault-01b", lotId: "lot-vault-01", shipmentId: rawShipments[1].id, title: "Redline Python", quantity: 3, isForSelfUse: false, price: 22_000 },
  { id: "item-vault-02a", lotId: "lot-vault-02", shipmentId: rawShipments[1].id, title: "Matchbox Superfast Truck (sample)", quantity: 2, isForSelfUse: false, price: 6_500 },

  { id: "item-gundam-01a", lotId: "lot-gundam-01", shipmentId: rawShipments[2].id, title: "MG RX-78-2 Gundam Ver 3.0", quantity: 8, isForSelfUse: false, price: 21_000 },
  {
    id: "item-gundam-01b", lotId: "lot-gundam-01", shipmentId: rawShipments[2].id, title: "MG Sazabi Ver Ka", quantity: 5, isForSelfUse: false, price: 28_000,
    linkedProductId: "product-gundam-mg-sazabi-ver-ka", linkedProductSlug: "product-gundam-mg-sazabi-ver-ka", linkedProductListingType: "standard",
  },
  { id: "item-gundam-02a", lotId: "lot-gundam-02", shipmentId: rawShipments[2].id, title: "HG Gunpla assorted mecha", quantity: 20, isForSelfUse: false, price: 3_500 },

  { id: "item-beyblade-01a", lotId: "lot-beyblade-01", shipmentId: rawShipments[3].id, title: "Beyblade Burst Turbo Achilles", quantity: 15, isForSelfUse: false, price: 5_500 },
  { id: "item-beyblade-01b", lotId: "lot-beyblade-01", shipmentId: rawShipments[3].id, title: "Beyblade Burst Genesis Valtryek", quantity: 12, isForSelfUse: false, price: 6_000 },
  { id: "item-beyblade-02a", lotId: "lot-beyblade-02", shipmentId: rawShipments[3].id, title: "Beystadium Extreme", quantity: 6, isForSelfUse: false, price: 4_800 },
];

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
