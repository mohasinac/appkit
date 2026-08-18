/**
 * Function #2 of the procurement-shipments cascade — the allocation engine.
 *
 * Fires on:
 *   (a) any write to shipmentLots/{lotId} (itemCount/revenue changed via
 *       Function #1, or the admin edited weight/cost/remainder fields)
 *   (b) any write to procurementShipments/{shipmentId} (admin edited
 *       customsTotal/shippingTotal/laborHoursSpent/status)
 *
 * Both re-run the same cross-lot allocation: read every sibling lot
 * (bounded ≤10), call the shared pure allocateShipmentCosts(), batch-write
 * each lot's customsAllocated/shippingAllocated/totalLandedCost/
 * projectedRevenue/projectedProfit plus the shipment's persisted
 * `totals` + `totalsComputedAt`. Also keeps ShipmentLot.shipmentStatus in
 * sync with its parent so the Projections list can filter on it directly.
 *
 * Skips writes that would be no-ops (value-identical) so the cascade
 * terminates instead of re-triggering itself indefinitely.
 */
import type { FirestoreTriggerHandler } from "../runtime/types";
import type { JobContext } from "../runtime/types";
import type { JsonValue } from "@mohasinac/appkit";
import { allocateShipmentCosts, type LotAllocationInput } from "../../../../features/shipments/utils/cost-allocation";

type Doc = Record<string, JsonValue>;

const DEFAULT_MAX_HOURS_PER_DAY = 4;

async function recomputeShipmentAllocation(shipmentId: string, ctx: JobContext): Promise<void> {
  const shipmentRef = ctx.db.collection("procurementShipments").doc(shipmentId);
  const shipmentSnap = await shipmentRef.get();
  if (!shipmentSnap.exists) return;
  const shipment = shipmentSnap.data() ?? {};

  const lotsSnap = await ctx.db.collection("shipmentLots").where("shipmentId", "==", shipmentId).get();
  const lots = lotsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Record<string, JsonValue> & { id: string });

  const allocationInputs: LotAllocationInput[] = lots.map((lot) => ({
    id: lot.id,
    purchaseCost: (lot.purchaseCost as number) ?? 0,
    weightGrams: (lot.weightGrams as number) ?? 0,
    mainItemsProjectedRevenue: (lot.mainItemsProjectedRevenue as number) ?? 0,
    remainderEstimatedValue: lot.remainderEstimatedValue as number | undefined,
    itemCount: (lot.itemCount as number) ?? 0,
  }));

  // Site-settings labor rate could be read here; falls back to the
  // shipment's own snapshot rate + a fixed max-hours-per-day default,
  // matching what the admin editor's preview also uses.
  const laborRatePerHour = (shipment.laborRatePerHour as number) ?? 0;
  const laborHoursSpent = (shipment.laborHoursSpent as number) ?? 0;

  const { perLot, totals } = allocateShipmentCosts({
    lots: allocationInputs,
    customsTotal: (shipment.customsTotal as number) ?? 0,
    shippingTotal: (shipment.shippingTotal as number) ?? 0,
    laborHoursSpent,
    laborRatePerHour,
    maxHoursPerDay: DEFAULT_MAX_HOURS_PER_DAY,
  });

  const batch = ctx.db.batch();
  let anyLotChanged = false;

  for (const lot of lots) {
    const computed = perLot[lot.id];
    const statusChanged = lot.shipmentStatus !== shipment.status;
    const valuesChanged =
      lot.customsAllocated !== computed.customsAllocated ||
      lot.shippingAllocated !== computed.shippingAllocated ||
      lot.totalLandedCost !== computed.totalLandedCost ||
      lot.projectedRevenue !== computed.projectedRevenue ||
      lot.projectedProfit !== computed.projectedProfit;

    if (statusChanged || valuesChanged) {
      anyLotChanged = true;
      batch.update(ctx.db.collection("shipmentLots").doc(lot.id), {
        ...computed,
        shipmentStatus: shipment.status,
        updatedAt: ctx.now,
      });
    }
  }

  const totalsUnchanged = JSON.stringify(shipment.totals ?? {}) === JSON.stringify(totals);
  if (!totalsUnchanged) {
    batch.update(shipmentRef, { totals, totalsComputedAt: ctx.now, updatedAt: ctx.now });
  }

  if (anyLotChanged || !totalsUnchanged) {
    await batch.commit();
    ctx.logger.info("Recomputed shipment allocation", { shipmentId, lotCount: lots.length });
  }
}

export const onShipmentLotWriteHandler: FirestoreTriggerHandler<Doc, Doc> = async (event, ctx) => {
  const shipmentId = (event.after?.shipmentId ?? event.before?.shipmentId) as string | undefined;
  if (!shipmentId) return;
  await recomputeShipmentAllocation(shipmentId, ctx);
};

export const onShipmentHeaderWriteHandler: FirestoreTriggerHandler<Doc, Doc> = async (event, ctx) => {
  const shipmentId = event.params.shipmentId;
  if (!shipmentId) return;
  await recomputeShipmentAllocation(shipmentId, ctx);
};
