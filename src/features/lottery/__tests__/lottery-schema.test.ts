import { describe, it, expect } from "vitest";
import { lotteryEntrySubmitSchema, flagLotteryEntrySchema, reopenLotterySlotSchema } from "../schemas/zod";

describe("lotteryEntrySubmitSchema", () => {
  const valid = {
    transactionId: "TXN-1234",
    paymentTime: "2026-07-12T10:00:00.000Z",
    purchasedItemNumber: 5,
    userPhone: "9876543210",
  };

  it("parses a valid input", () => {
    const result = lotteryEntrySubmitSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects phone with fewer than 10 digits", () => {
    const result = lotteryEntrySubmitSchema.safeParse({ ...valid, userPhone: "123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "userPhone")).toBe(true);
    }
  });

  it("rejects itemNumber of 0 (min is 1)", () => {
    const result = lotteryEntrySubmitSchema.safeParse({ ...valid, purchasedItemNumber: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "purchasedItemNumber")).toBe(true);
    }
  });

  it("rejects transactionId shorter than 4 chars", () => {
    const result = lotteryEntrySubmitSchema.safeParse({ ...valid, transactionId: "AB" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "transactionId")).toBe(true);
    }
  });

  it("rejects missing transactionId", () => {
    const { transactionId: _, ...rest } = valid;
    const result = lotteryEntrySubmitSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "transactionId")).toBe(true);
    }
  });

  it("rejects invalid paymentTime datetime", () => {
    const result = lotteryEntrySubmitSchema.safeParse({ ...valid, paymentTime: "not-a-date" });
    expect(result.success).toBe(false);
  });
});

describe("flagLotteryEntrySchema", () => {
  it("parses valid flag input", () => {
    const result = flagLotteryEntrySchema.safeParse({
      entryId: "entry-123",
      flagNote: "Suspicious TX ID",
      flaggedByUserId: "user-admin",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty flagNote", () => {
    const result = flagLotteryEntrySchema.safeParse({
      entryId: "entry-123",
      flagNote: "",
      flaggedByUserId: "user-admin",
    });
    expect(result.success).toBe(false);
  });
});

describe("reopenLotterySlotSchema", () => {
  it("parses valid reopen input", () => {
    const result = reopenLotterySlotSchema.safeParse({
      sourceType: "event",
      sourceId: "event-poker-draw",
      slotNumber: 3,
      adminUserId: "user-admin",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid sourceType", () => {
    const result = reopenLotterySlotSchema.safeParse({
      sourceType: "invalid",
      sourceId: "event-poker-draw",
      slotNumber: 3,
      adminUserId: "user-admin",
    });
    expect(result.success).toBe(false);
  });
});
