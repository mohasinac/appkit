import { describe, it, expect } from "vitest";
import { calculateGst } from "../calculator";

describe("calculateGst", () => {
  it("splits intra-state GST evenly between CGST and SGST, IGST=0", () => {
    const result = calculateGst(18, true, 100000);
    expect(result.cgst).toBe(9000);
    expect(result.sgst).toBe(9000);
    expect(result.igst).toBe(0);
    expect(result.gstAmount).toBe(18000);
    expect(result.taxableAmount).toBe(100000);
  });

  it("charges the full rate as IGST for inter-state, CGST=SGST=0", () => {
    const result = calculateGst(18, false, 100000);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.igst).toBe(18000);
    expect(result.gstAmount).toBe(18000);
  });

  it("returns zero tax for a 0% (exempt) rate", () => {
    const result = calculateGst(0, true, 100000);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.igst).toBe(0);
    expect(result.gstAmount).toBe(0);
  });

  it("keeps cgst + sgst exactly equal to gstAmount even when the raw amount is odd (rounding)", () => {
    const result = calculateGst(5, true, 100001);
    expect(result.cgst + result.sgst).toBe(result.gstAmount);
  });

  it("computes 5%, 12%, and 28% rates correctly for inter-state", () => {
    expect(calculateGst(5, false, 100000).igst).toBe(5000);
    expect(calculateGst(12, false, 100000).igst).toBe(12000);
    expect(calculateGst(28, false, 100000).igst).toBe(28000);
  });
});
