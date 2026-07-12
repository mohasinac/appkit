import { describe, it, expect } from "vitest";
import {
  computeWeight,
  pickWeightedSlot,
  assignSlotWeights,
  LotteryError,
} from "../types/index";
import type { LotterySlot, LotteryConfig } from "../types/index";

function makeSlot(overrides: Partial<LotterySlot> = {}): LotterySlot {
  return {
    slotNumber: 1,
    name: "Test Slot",
    priceInPaise: 1000_00,
    weight: 50,
    isBooked: false,
    ...overrides,
  };
}

describe("computeWeight", () => {
  it("returns 100 for zero price (max weight)", () => {
    expect(computeWeight(0, 10000)).toBe(100);
  });

  it("returns 1 for max price (min weight, never 0)", () => {
    expect(computeWeight(10000, 10000)).toBe(1);
  });

  it("returns midpoint weight for midpoint price", () => {
    // Math.max(1, Math.round((1 - 5000/10000) * 99) + 1) = Math.round(0.5 * 99) + 1 = 50 + 1 = 51
    expect(computeWeight(5000, 10000)).toBe(51);
  });

  it("returns 50 when maxPriceInPaise is 0 (uniform mode fallback)", () => {
    expect(computeWeight(0, 0)).toBe(50);
    expect(computeWeight(1000, 0)).toBe(50);
  });

  it("always returns at least 1", () => {
    // Even for price equal to max, weight is 1 not 0
    expect(computeWeight(99999, 100000)).toBeGreaterThanOrEqual(1);
  });
});

describe("assignSlotWeights — uniform mode", () => {
  it("assigns weight 50 to all slots in uniform mode", () => {
    const config: LotteryConfig = {
      slots: [
        makeSlot({ slotNumber: 1, priceInPaise: 1000_00, weight: 0 }),
        makeSlot({ slotNumber: 2, priceInPaise: 5000_00, weight: 0 }),
        makeSlot({ slotNumber: 3, priceInPaise: 10000_00, weight: 0 }),
      ],
      totalSlots: 3,
      pricingMode: "uniform",
      uniformPriceInPaise: 1000_00,
      drawWindowDurationMinutes: 5,
      maxPullsPerTransaction: 1,
      maxPullsPerUser: 1,
    };

    const result = assignSlotWeights(config);
    for (const slot of result) {
      expect(slot.weight).toBe(50);
    }
  });
});

describe("assignSlotWeights — variable mode", () => {
  it("gives lower-priced slots higher weight than higher-priced slots", () => {
    const config: LotteryConfig = {
      slots: [
        makeSlot({ slotNumber: 1, priceInPaise: 100_00, weight: 0 }),   // cheap → high weight
        makeSlot({ slotNumber: 2, priceInPaise: 5000_00, weight: 0 }),  // expensive → low weight
      ],
      totalSlots: 2,
      pricingMode: "variable",
      drawWindowDurationMinutes: 5,
      maxPullsPerTransaction: 1,
      maxPullsPerUser: 1,
    };

    const result = assignSlotWeights(config);
    expect(result[0].weight).toBeGreaterThan(result[1].weight);
  });
});

describe("pickWeightedSlot", () => {
  it("throws LotteryError LOTTERY_FULL when unclaimed is empty", () => {
    expect(() => pickWeightedSlot([])).toThrowError(LotteryError);
    try {
      pickWeightedSlot([]);
    } catch (err) {
      if (err instanceof LotteryError) {
        expect(err.code).toBe("LOTTERY_FULL");
      }
    }
  });

  it("returns the only slot when there is exactly one", () => {
    const slot = makeSlot({ slotNumber: 1, weight: 50 });
    expect(pickWeightedSlot([slot])).toBe(slot);
  });

  it("statistically favours higher-weight slot (~99% over 10000 trials)", () => {
    const low = makeSlot({ slotNumber: 1, weight: 1 });
    const high = makeSlot({ slotNumber: 2, weight: 99 });

    let highCount = 0;
    const trials = 10_000;
    for (let i = 0; i < trials; i++) {
      if (pickWeightedSlot([low, high]) === high) highCount++;
    }
    const ratio = highCount / trials;
    // Allow ±3% tolerance
    expect(ratio).toBeGreaterThan(0.96);
    expect(ratio).toBeLessThan(1.0);
  });

  it("always picks from unclaimed slots only", () => {
    const booked = makeSlot({ slotNumber: 1, weight: 99, isBooked: true });
    const available = makeSlot({ slotNumber: 2, weight: 1, isBooked: false });

    // pickWeightedSlot only receives unclaimed — so booked should never be passed
    const unclaimed = [available];
    const result = pickWeightedSlot(unclaimed);
    expect(result.slotNumber).toBe(2);
  });
});
