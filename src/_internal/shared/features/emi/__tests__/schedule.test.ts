import { describe, it, expect } from "vitest";
import { checkEmiEligibility, computeEmiSchedule } from "../schedule";

describe("checkEmiEligibility", () => {
  const settings = { enabled: true, minOrderValueInPaise: 1000000 };

  it("settings.enabled false → ineligible, reason site_disabled", () => {
    const result = checkEmiEligibility(2000000, true, { ...settings, enabled: false });
    expect(result).toEqual({ eligible: false, reason: "site_disabled" });
  });

  it("seller has not opted in → ineligible, reason seller_disabled", () => {
    const result = checkEmiEligibility(2000000, false, settings);
    expect(result).toEqual({ eligible: false, reason: "seller_disabled" });
  });

  it("subtotal at or below the minimum → ineligible, reason below_minimum", () => {
    expect(checkEmiEligibility(1000000, true, settings)).toEqual({
      eligible: false,
      reason: "below_minimum",
    });
    expect(checkEmiEligibility(500000, true, settings)).toEqual({
      eligible: false,
      reason: "below_minimum",
    });
  });

  it("subtotal above minimum + site + seller enabled → eligible", () => {
    expect(checkEmiEligibility(1000001, true, settings)).toEqual({ eligible: true });
  });
});

describe("computeEmiSchedule", () => {
  const settings = {
    tokenPercent: 10,
    billingDay: 5,
    surchargePercentPerMonth: 1,
    surchargeSellerSharePercent: 50,
  };

  it("computes token, surcharge, and installments for a 3-month tenure", () => {
    // subtotal = 1200000 paise (₹12,000)
    // tokenAmount = 10% = 120000
    // principalRemaining = 1080000
    // surchargeAmount = 1080000 * 1% * 3 = 32400
    // surchargeSellerShare = 50% of 32400 = 16200; platformShare = 16200
    // totalToInstall = 1080000 + 32400 = 1112400
    // baseInstallment = floor(1112400 / 3) = 370800, remainder = 0
    const result = computeEmiSchedule(1200000, 3, settings, new Date(Date.UTC(2026, 5, 15))); // June 15 2026
    expect(result.tokenAmount).toBe(120000);
    expect(result.surchargeAmount).toBe(32400);
    expect(result.surchargeSellerShare).toBe(16200);
    expect(result.surchargePlatformShare).toBe(16200);
    expect(result.remainingBalance).toBe(1112400);
    expect(result.installments).toHaveLength(3);
    expect(result.installments.map((i) => i.amount)).toEqual([370800, 370800, 370800]);
  });

  it("first installment falls in the month AFTER purchase, on the configured billing day", () => {
    const result = computeEmiSchedule(1200000, 2, settings, new Date(Date.UTC(2026, 5, 15))); // June 15 2026
    // Purchase in June (month index 5) → first installment in July (index 6), day 5.
    expect(result.installments[0].dueDate.getUTCFullYear()).toBe(2026);
    expect(result.installments[0].dueDate.getUTCMonth()).toBe(6); // July
    expect(result.installments[0].dueDate.getUTCDate()).toBe(5);
    expect(result.installments[1].dueDate.getUTCMonth()).toBe(7); // August
  });

  it("purchase in December rolls the first installment into January of the next year", () => {
    const result = computeEmiSchedule(1200000, 2, settings, new Date(Date.UTC(2026, 11, 20))); // Dec 20 2026
    expect(result.installments[0].dueDate.getUTCFullYear()).toBe(2027);
    expect(result.installments[0].dueDate.getUTCMonth()).toBe(0); // January
  });

  it("last installment absorbs the rounding remainder so the total matches remainingBalance exactly", () => {
    // subtotal chosen so totalToInstall doesn't divide evenly by tenure.
    const result = computeEmiSchedule(1000003, 4, settings, new Date(Date.UTC(2026, 0, 1)));
    const sum = result.installments.reduce((s, i) => s + i.amount, 0);
    expect(sum).toBe(result.remainingBalance);
  });

  it("billingDay is clamped to the 1–10 range", () => {
    const result = computeEmiSchedule(1200000, 2, { ...settings, billingDay: 25 }, new Date(Date.UTC(2026, 5, 1)));
    expect(result.installments[0].dueDate.getUTCDate()).toBe(10);
  });
});
