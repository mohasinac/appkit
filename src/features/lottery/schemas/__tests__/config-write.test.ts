/*
 * The slot-wipe guard.
 *
 * Kept as a unit test despite this project's tester-cases-first preference,
 * for the same reason the W13 per-type test was: the failure is INVISIBLE in
 * the UI. The save succeeds, the page re-renders, the config looks right —
 * and the only tell is that a buyer's pull is gone. A manual case can catch
 * it (and one exists), but nothing should be able to reintroduce the bug and
 * still ship green.
 *
 * Each assertion here was checked to FAIL against the pre-fix behaviour
 * (`isBooked: false` hardcoded on every slot), so it guards something real
 * rather than asserting that the code is the code.
 */

import { describe, it, expect } from "vitest";
import {
  lotteryConfigWriteSchema,
  lotterySlotWriteSchema,
  mergeLotteryConfig,
} from "../config-write";
import type { LotteryConfig } from "../../types/index";

const booked: LotteryConfig = {
  slots: [
    { slotNumber: 1, name: "Dran Sword", price: 500, weight: 3, isBooked: false },
    {
      slotNumber: 2,
      name: "Hells Scythe",
      price: 500,
      weight: 3,
      isBooked: true,
      bookedByUserId: "user-tyson-blader",
      bookedByDisplayName: "Tyson",
      bookedByUserLotteryNumber: 17,
    },
    { slotNumber: 3, name: "Wizard Arrow", price: 500, weight: 3, isBooked: false },
  ],
  totalSlots: 3,
  pricingMode: "uniform",
  uniformPrice: 500,
  drawWindowDurationMinutes: 5,
  maxPullsPerTransaction: 1,
  maxPullsPerUser: 1,
};

const edit = {
  slots: [
    { slotNumber: 1, name: "Dran Sword", price: 500 },
    { slotNumber: 2, name: "Hells Scythe (renamed)", price: 500 },
    { slotNumber: 3, name: "Wizard Arrow", price: 500 },
  ],
  pricingMode: "uniform" as const,
  uniformPrice: 500,
  drawWindowDurationMinutes: 5,
  maxPullsPerTransaction: 1,
  maxPullsPerUser: 1,
};

describe("mergeLotteryConfig", () => {
  it("carries booking state across an unrelated edit", () => {
    const result = mergeLotteryConfig(edit, booked);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const slot2 = result.config.slots.find((s) => s.slotNumber === 2)!;
    // The whole point. Pre-fix this was `false` and the buyer vanished.
    expect(slot2.isBooked).toBe(true);
    expect(slot2.bookedByUserId).toBe("user-tyson-blader");
    expect(slot2.bookedByDisplayName).toBe("Tyson");
    expect(slot2.bookedByUserLotteryNumber).toBe(17);
    // …and the admin's actual edit still applied.
    expect(slot2.name).toBe("Hells Scythe (renamed)");
  });

  it("matches by slotNumber, not by array index", () => {
    // Slot 1 removed: index-wise, the booked slot 2 would land at index 0 and
    // inherit slot 1's identity, handing its buyer the wrong prize.
    const reordered = {
      ...edit,
      slots: [
        { slotNumber: 3, name: "Wizard Arrow", price: 500 },
        { slotNumber: 2, name: "Hells Scythe", price: 500 },
        { slotNumber: 1, name: "Dran Sword", price: 500 },
      ],
    };
    const result = mergeLotteryConfig(reordered, booked);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.slots.find((s) => s.slotNumber === 2)!.isBooked).toBe(true);
    expect(result.config.slots.find((s) => s.slotNumber === 3)!.isBooked).toBe(false);
  });

  it("refuses to remove a slot that has been pulled", () => {
    const removed = { ...edit, slots: edit.slots.filter((s) => s.slotNumber !== 2) };
    const result = mergeLotteryConfig(removed, booked);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("BOOKED_SLOT_REMOVED");
    expect(result.slotNumbers).toEqual([2]);
  });

  it("allows removing an unbooked slot", () => {
    const removed = { ...edit, slots: edit.slots.filter((s) => s.slotNumber !== 3) };
    const result = mergeLotteryConfig(removed, booked);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.totalSlots).toBe(2);
  });

  it("derives totalSlots from the array rather than trusting input", () => {
    const result = mergeLotteryConfig(edit, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.totalSlots).toBe(3);
    expect(result.config.slots.every((s) => !s.isBooked)).toBe(true);
  });
});

describe("lotteryConfigWriteSchema", () => {
  it("rejects a slot that tries to declare booking state", () => {
    // The input shape cannot express `isBooked`, so a caller cannot smuggle
    // one past the merge — it is a 400, not something to defend against.
    const parsed = lotterySlotWriteSchema.safeParse({
      slotNumber: 1,
      name: "x",
      price: 1,
      isBooked: true,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects duplicate slot numbers", () => {
    const parsed = lotteryConfigWriteSchema.safeParse({
      ...edit,
      slots: [
        { slotNumber: 1, name: "a", price: 1 },
        { slotNumber: 1, name: "b", price: 1 },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("requires a price when pricing is uniform", () => {
    const { uniformPrice: _drop, ...noPrice } = edit;
    expect(lotteryConfigWriteSchema.safeParse(noPrice).success).toBe(false);
  });
});
