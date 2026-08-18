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
import { roundRupees } from "../../../utils/number.formatter";

export type LotAllocationInput = Pick<
  ShipmentLot,
  "id" | "purchaseCost" | "weightGrams" | "mainItemsProjectedRevenue" | "remainderEstimatedValue" | "itemCount"
>;

export type LotAllocationResult = Pick<
  ShipmentLot,
  "customsAllocated" | "shippingAllocated" | "totalLandedCost" | "projectedRevenue" | "projectedProfit"
>;

export interface AllocateShipmentCostsInput {
  lots: LotAllocationInput[];
  customsTotal: number;
  shippingTotal: number;
  laborHoursSpent: number;
  laborRatePerHour: number;
  maxHoursPerDay: number;
}

export interface AllocateShipmentCostsResult {
  perLot: Record<string, LotAllocationResult>;
  totals: ShipmentTotals;
}

/**
 * Splits `total` across `weights` proportionally, with the remainder
 * corrected onto the last non-zero-weight entry so the sum always
 * reconciles exactly to `total` (rupee-2dp-safe).
 */
function allocateProportionally(total: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  if (totalWeight <= 0 || total === 0) return weights.map(() => 0);

  const shares = weights.map((w) => roundRupees((total * w) / totalWeight));
  const allocated = shares.reduce((s, v) => s + v, 0);
  const remainder = roundRupees(total - allocated);

  if (remainder !== 0) {
    let lastPositiveIndex = -1;
    for (let i = weights.length - 1; i >= 0; i--) {
      if (weights[i] > 0) {
        lastPositiveIndex = i;
        break;
      }
    }
    if (lastPositiveIndex >= 0) shares[lastPositiveIndex] = roundRupees(shares[lastPositiveIndex] + remainder);
  }

  return shares;
}

export function allocateShipmentCosts(input: AllocateShipmentCostsInput): AllocateShipmentCostsResult {
  const { lots, customsTotal, shippingTotal, laborHoursSpent, laborRatePerHour, maxHoursPerDay } = input;

  const costWeights = lots.map((lot) => lot.purchaseCost);
  const weightWeights = lots.map((lot) => lot.weightGrams);

  const customsShares = allocateProportionally(customsTotal, costWeights);
  const shippingShares = allocateProportionally(shippingTotal, weightWeights);

  const perLot: Record<string, LotAllocationResult> = {};
  let totalProjectedRevenue = 0;
  let totalItemCount = 0;

  lots.forEach((lot, i) => {
    const customsAllocated = customsShares[i];
    const shippingAllocated = shippingShares[i];
    const totalLandedCost = roundRupees(lot.purchaseCost + customsAllocated + shippingAllocated);
    const projectedRevenue = lot.mainItemsProjectedRevenue + (lot.remainderEstimatedValue ?? 0);
    const projectedProfit = roundRupees(projectedRevenue - totalLandedCost);

    perLot[lot.id] = {
      customsAllocated,
      shippingAllocated,
      totalLandedCost,
      projectedRevenue,
      projectedProfit,
    };

    totalProjectedRevenue += projectedRevenue;
    totalItemCount += lot.itemCount;
  });

  const lotsCost = costWeights.reduce((s, v) => s + v, 0);
  const laborCost = roundRupees(laborHoursSpent * laborRatePerHour);
  const totalShipmentCost = roundRupees(lotsCost + customsTotal + shippingTotal);
  const projectedProfit = roundRupees(totalProjectedRevenue - totalShipmentCost);
  const projectedProfitAfterLabor = roundRupees(projectedProfit - laborCost);
  const totalWeightGrams = weightWeights.reduce((s, v) => s + v, 0);

  const totals: ShipmentTotals = {
    lotsCost,
    customsTotal,
    shippingTotal,
    laborCost,
    totalShipmentCost,
    totalProjectedRevenue,
    projectedProfit,
    projectedProfitAfterLabor,
    projectedMarginPercent:
      totalProjectedRevenue > 0 ? (projectedProfit / totalProjectedRevenue) * 100 : 0,
    projectedRoiPercent:
      totalShipmentCost > 0 ? (projectedProfit / totalShipmentCost) * 100 : 0,
    totalWeightGrams,
    totalItemCount,
    lotCount: lots.length,
    estimatedProcessingDays: maxHoursPerDay > 0 ? laborHoursSpent / maxHoursPerDay : 0,
  };

  return { perLot, totals };
}
