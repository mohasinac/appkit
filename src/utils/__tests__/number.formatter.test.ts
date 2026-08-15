import { describe, it, expect } from "vitest";
import { parseFormattedNumber, formatCompactNumber } from "../number.formatter";

describe("parseFormattedNumber", () => {
  // Regression for bug #13: a single separator followed by exactly 3 digits
  // is the standard thousands-grouping shape, but the old ">3" threshold
  // treated it as a decimal instead.
  it("parses a single-comma 3-digit group as thousands, not a decimal", () => {
    expect(parseFormattedNumber("1,234")).toBe(1234);
    expect(parseFormattedNumber("12,345")).toBe(12345);
  });

  it("parses a single-dot 3-digit group (European thousands notation) as thousands", () => {
    expect(parseFormattedNumber("3.500")).toBe(3500);
  });

  it("still parses a genuine 1-2 digit decimal correctly", () => {
    expect(parseFormattedNumber("12.5")).toBe(12.5);
    expect(parseFormattedNumber("1,25")).toBe(1.25);
  });

  it("still parses multi-group thousands with a decimal tail correctly", () => {
    expect(parseFormattedNumber("1,234,567.89")).toBe(1234567.89);
    expect(parseFormattedNumber("1.234.567,89")).toBe(1234567.89);
  });

  it("still parses a plain integer correctly", () => {
    expect(parseFormattedNumber("1234")).toBe(1234);
  });
});

describe("formatCompactNumber", () => {
  // Regression for bug #14: rounding could push a value to the next unit's
  // boundary (e.g. 999950 rounds to "1000.0" at the K scale) without
  // escalating to the next unit, producing "1000.0K" instead of "1.0M".
  it("rolls a K-boundary value over to M instead of showing 1000.0K", () => {
    expect(formatCompactNumber(999950)).toBe("1.0M");
    expect(formatCompactNumber(999999)).toBe("1.0M");
  });

  it("rolls an M-boundary value over to B instead of showing 1000.0M", () => {
    expect(formatCompactNumber(999_950_000)).toBe("1.0B");
  });

  it("formats ordinary values in each unit unchanged", () => {
    expect(formatCompactNumber(500)).toBe("500");
    expect(formatCompactNumber(1500)).toBe("1.5K");
    expect(formatCompactNumber(2_500_000)).toBe("2.5M");
    expect(formatCompactNumber(3_000_000_000)).toBe("3.0B");
  });
});
