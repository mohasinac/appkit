import { describe, it, expect } from "vitest";
import { checkEmiEligibility, computeEmiSchedule } from "../schedule";

describe("checkEmiEligibility", () => {
  const settings = { enabled: true, minOrderValue: 10000 };

  it("settings.enabled false → ineligible, reason site_disabled", () => {
    const result = checkEmiEligibility(20000, true, { ...settings, enabled: false });
    expect(result).toEqual({ eligible: false, reason: "site_disabled" });
  });

  it("seller has not opted in → ineligible, reason seller_disabled", () => {
    const result = checkEmiEligibility(20000, false, settings);
    expect(result).toEqual({ eligible: false, reason: "seller_disabled" });
  });

  it("subtotal at or below the minimum → ineligible, reason below_minimum", () => {
    expect(checkEmiEligibility(10000, true, settings)).toEqual({
      eligible: false,
      reason: "below_minimum",
    });
    expect(checkEmiEligibility(5000, true, settings)).toEqual({
      eligible: false,
      reason: "below_minimum",
    });
  });

  it("subtotal above minimum + site + seller enabled → eligible", () => {
    expect(checkEmiEligibility(10000.01, true, settings)).toEqual({ eligible: true });
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
    // subtotal = ₹12,000
    // tokenAmount = 10% = 1200
    // principalRemaining = 10800
    // surchargeAmount = 10800 * 1% * 3 = 324
    // surchargeSellerShare = 50% of 324 = 162; platformShare = 162
    // totalToInstall = 10800 + 324 = 11124
    // baseInstallment = floor(11124 / 3) = 3708, remainder = 0
    const result = computeEmiSchedule(12000, 3, settings, new Date(Date.UTC(2026, 5, 15))); // June 15 2026
    expect(result.tokenAmount).toBe(1200);
    expect(result.surchargeAmount).toBe(324);
    expect(result.surchargeSellerShare).toBe(162);
    expect(result.surchargePlatformShare).toBe(162);
    expect(result.remainingBalance).toBe(11124);
    expect(result.installments).toHaveLength(3);
    expect(result.installments.map((i) => i.amount)).toEqual([3708, 3708, 3708]);
  });

  it("first installment falls in the month AFTER purchase, on the configured billing day", () => {
    const result = computeEmiSchedule(12000, 2, settings, new Date(Date.UTC(2026, 5, 15))); // June 15 2026
    // Purchase in June (month index 5) → first installment in July (index 6), day 5.
    expect(result.installments[0].dueDate.getUTCFullYear()).toBe(2026);
    expect(result.installments[0].dueDate.getUTCMonth()).toBe(6); // July
    expect(result.installments[0].dueDate.getUTCDate()).toBe(5);
    expect(result.installments[1].dueDate.getUTCMonth()).toBe(7); // August
  });

  it("purchase in December rolls the first installment into January of the next year", () => {
    const result = computeEmiSchedule(12000, 2, settings, new Date(Date.UTC(2026, 11, 20))); // Dec 20 2026
    expect(result.installments[0].dueDate.getUTCFullYear()).toBe(2027);
    expect(result.installments[0].dueDate.getUTCMonth()).toBe(0); // January
  });

  it("last installment absorbs the rounding remainder so the total matches remainingBalance exactly", () => {
    // subtotal chosen so totalToInstall doesn't divide evenly by tenure.
    const result = computeEmiSchedule(10000.03, 4, settings, new Date(Date.UTC(2026, 0, 1)));
    const sum = result.installments.reduce((s, i) => s + i.amount, 0);
    expect(sum).toBe(result.remainingBalance);
  });

  it("billingDay is clamped to the 1–10 range", () => {
    const result = computeEmiSchedule(12000, 2, { ...settings, billingDay: 25 }, new Date(Date.UTC(2026, 5, 1)));
    expect(result.installments[0].dueDate.getUTCDate()).toBe(10);
  });
});
