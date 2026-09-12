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

/*
 * 🛑 THIS COMPARISON IS LOAD-BEARING. GETTING IT WRONG IS AN INFINITE LOOP THAT
 * COSTS REAL MONEY, AND IT ALREADY DID.
 *
 * `onShipmentHeaderWrite` watches `procurementShipments/{shipmentId}` on
 * documentWritten and writes BACK to that same document. The only thing stopping
 * that from recurring forever is this equality check, so a false "changed" is not
 * a wasted write — it is a permanent, self-sustaining cascade.
 *
 * It was `JSON.stringify(shipment.totals ?? {}) === JSON.stringify(totals)`.
 * That is key-ORDER sensitive, and the two sides can never agree:
 *
 *   computed  — construction order from allocateShipmentCosts():
 *               lotsCost, customsTotal, shippingTotal, laborCost, …
 *   stored    — Firestore returns map fields with keys sorted ALPHABETICALLY:
 *               customsTotal, estimatedProcessingDays, laborCost, lotCount, …
 *
 * So `totalsUnchanged` was ALWAYS false, every invocation wrote, and every write
 * re-triggered the function. Measured 2026-09-11 in the Firebase console:
 * `onShipmentHeaderWrite` 1,017,548 and `onShipmentDeleted` 1,017,372 invocations
 * in 24 HOURS — 12M for the month against a 2M/month free quota, exceeded by
 * 9.7M, while every other function in the project sat between 0 and 95.
 *
 * `onShipmentDeleted` was pure collateral: it is correctly guarded
 * (`if (event.after) return`) but is bound to the same path, so it woke up a
 * million times a day just to return.
 *
 * Two properties this replacement needs, and the old one had neither:
 *   1. KEY ORDER MUST NOT MATTER — compare by key, never by serialised form.
 *   2. FLOATS NEED TOLERANCE. `projectedMarginPercent` and `projectedRoiPercent`
 *      are unrounded divisions, and a Firestore round-trip can return a value
 *      that differs in the last bit. Exact `!==` on those is another way to make
 *      "unchanged" unreachable — the same bug with a different mechanism.
 */
const MONEY_EPSILON = 0.005; // half a paisa: below anything that can be displayed

function numbersEqual(a: JsonValue | undefined, b: JsonValue | undefined): boolean {
  const x = typeof a === "number" ? a : Number.NaN;
  const y = typeof b === "number" ? b : Number.NaN;
  if (Number.isNaN(x) && Number.isNaN(y)) return a === b; // both non-numeric: identity
  return Math.abs(x - y) < MONEY_EPSILON;
}

/** Value equality over a flat numeric map, independent of key order. */
function totalsEqual(stored: JsonValue | undefined, computed: Record<string, JsonValue>): boolean {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return false;
  const a = stored as Record<string, JsonValue>;
  const keys = new Set([...Object.keys(a), ...Object.keys(computed)]);
  for (const k of keys) {
    if (!numbersEqual(a[k], computed[k])) return false;
  }
  return true;
}

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
    /*
     * Same tolerance as the totals check, for the same reason: a lot write fires
     * `onShipmentLotWrite`, which calls straight back into this function. Exact
     * `!==` on a float that has round-tripped through Firestore is a second,
     * independent path to the same infinite cascade.
     */
    const valuesChanged =
      !numbersEqual(lot.customsAllocated, computed.customsAllocated) ||
      !numbersEqual(lot.shippingAllocated, computed.shippingAllocated) ||
      !numbersEqual(lot.totalLandedCost, computed.totalLandedCost) ||
      !numbersEqual(lot.projectedRevenue, computed.projectedRevenue) ||
      !numbersEqual(lot.projectedProfit, computed.projectedProfit);

    if (statusChanged || valuesChanged) {
      anyLotChanged = true;
      batch.update(ctx.db.collection("shipmentLots").doc(lot.id), {
        ...computed,
        shipmentStatus: shipment.status,
        updatedAt: ctx.now,
      });
    }
  }

  const totalsUnchanged = totalsEqual(shipment.totals, totals as unknown as Record<string, JsonValue>);
  if (!totalsUnchanged) {
    // trigger-self-write-ok: this writes to the collection onShipmentHeaderWrite
    // watches, so it re-triggers itself — ONCE. The second pass recomputes the
    // same `totals` from unchanged inputs, totalsEqual() reports them identical
    // (by key, with a float tolerance — NOT by JSON.stringify, which is key-order
    // sensitive and is what made this loop run 1,017,548 times in 24h), so no
    // write happens and the cascade stops. Pinned by
    // scripts/verify-shipment-allocation-guard.mjs.
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
