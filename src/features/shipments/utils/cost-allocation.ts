/**
 * Procurement Shipment cost allocation.
 *
 * Authoritative caller is the Firestore-triggered Function cascade
 * (appkit/src/_internal/server/functions/firestore/on-shipment-lot-write.ts)
 * — totals are never computed inline in a Vercel route or React component.
 * The admin editor may still call this client-side for a cosmetic live
 * preview, but only the Function's write is ever persisted.
 */

import type { ShipmentLot, ShipmentTotals } from "../schemas/firestore";

export type LotAllocationInput = Pick<
  ShipmentLot,
  "id" | "purchaseCostPaise" | "weightGrams" | "mainItemsProjectedRevenuePaise" | "remainderEstimatedValuePaise" | "itemCount"
>;

export type LotAllocationResult = Pick<
  ShipmentLot,
  "customsAllocatedPaise" | "shippingAllocatedPaise" | "totalLandedCostPaise" | "projectedRevenuePaise" | "projectedProfitPaise"
>;

export interface AllocateShipmentCostsInput {
  lots: LotAllocationInput[];
  customsTotalPaise: number;
  shippingTotalPaise: number;
  laborHoursSpent: number;
  laborRatePaisePerHour: number;
  maxHoursPerDay: number;
}

export interface AllocateShipmentCostsResult {
  perLot: Record<string, LotAllocationResult>;
  totals: ShipmentTotals;
}

/**
 * Splits `totalPaise` across `weights` proportionally, with the remainder
 * corrected onto the last non-zero-weight entry so the sum always
 * reconciles exactly to `totalPaise` (integer-paise-safe).
 */
function allocateProportionally(totalPaise: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  if (totalWeight <= 0 || totalPaise === 0) return weights.map(() => 0);

  const shares = weights.map((w) => Math.round((totalPaise * w) / totalWeight));
  const allocated = shares.reduce((s, v) => s + v, 0);
  const remainder = totalPaise - allocated;

  if (remainder !== 0) {
    let lastPositiveIndex = -1;
    for (let i = weights.length - 1; i >= 0; i--) {
      if (weights[i] > 0) {
        lastPositiveIndex = i;
        break;
      }
    }
    if (lastPositiveIndex >= 0) shares[lastPositiveIndex] += remainder;
  }

  return shares;
}

export function allocateShipmentCosts(input: AllocateShipmentCostsInput): AllocateShipmentCostsResult {
  const { lots, customsTotalPaise, shippingTotalPaise, laborHoursSpent, laborRatePaisePerHour, maxHoursPerDay } = input;

  const costWeights = lots.map((lot) => lot.purchaseCostPaise);
  const weightWeights = lots.map((lot) => lot.weightGrams);

  const customsShares = allocateProportionally(customsTotalPaise, costWeights);
  const shippingShares = allocateProportionally(shippingTotalPaise, weightWeights);

  const perLot: Record<string, LotAllocationResult> = {};
  let totalProjectedRevenuePaise = 0;
  let totalItemCount = 0;

  lots.forEach((lot, i) => {
    const customsAllocatedPaise = customsShares[i];
    const shippingAllocatedPaise = shippingShares[i];
    const totalLandedCostPaise = lot.purchaseCostPaise + customsAllocatedPaise + shippingAllocatedPaise;
    const projectedRevenuePaise = lot.mainItemsProjectedRevenuePaise + (lot.remainderEstimatedValuePaise ?? 0);
    const projectedProfitPaise = projectedRevenuePaise - totalLandedCostPaise;

    perLot[lot.id] = {
      customsAllocatedPaise,
      shippingAllocatedPaise,
      totalLandedCostPaise,
      projectedRevenuePaise,
      projectedProfitPaise,
    };

    totalProjectedRevenuePaise += projectedRevenuePaise;
    totalItemCount += lot.itemCount;
  });

  const lotsCostPaise = costWeights.reduce((s, v) => s + v, 0);
  const laborCostPaise = Math.round(laborHoursSpent * laborRatePaisePerHour);
  const totalShipmentCostPaise = lotsCostPaise + customsTotalPaise + shippingTotalPaise;
  const projectedProfitPaise = totalProjectedRevenuePaise - totalShipmentCostPaise;
  const projectedProfitAfterLaborPaise = projectedProfitPaise - laborCostPaise;
  const totalWeightGrams = weightWeights.reduce((s, v) => s + v, 0);

  const totals: ShipmentTotals = {
    lotsCostPaise,
    customsTotalPaise,
    shippingTotalPaise,
    laborCostPaise,
    totalShipmentCostPaise,
    totalProjectedRevenuePaise,
    projectedProfitPaise,
    projectedProfitAfterLaborPaise,
    projectedMarginPercent:
      totalProjectedRevenuePaise > 0 ? (projectedProfitPaise / totalProjectedRevenuePaise) * 100 : 0,
    projectedRoiPercent:
      totalShipmentCostPaise > 0 ? (projectedProfitPaise / totalShipmentCostPaise) * 100 : 0,
    totalWeightGrams,
    totalItemCount,
    lotCount: lots.length,
    estimatedProcessingDays: maxHoursPerDay > 0 ? laborHoursSpent / maxHoursPerDay : 0,
  };

  return { perLot, totals };
}
