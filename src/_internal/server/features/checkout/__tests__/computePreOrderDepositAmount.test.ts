import { describe, it, expect } from "vitest";
import { computePreOrderDepositAmount } from "../../../../shared/checkout/order-math";
import type { CartItemDocument } from "../../../../../features/cart/schemas/firestore";
import type { ProductDocument } from "../../../../../features/products/schemas/firestore";

function line(quantity: number, price: number, preOrderDepositPercent?: number) {
  return {
    item: { quantity, bundleCategorySlug: undefined, bundleProductIds: undefined } as unknown as CartItemDocument,
    product: { price, preOrderDepositPercent } as unknown as ProductDocument,
  };
}

describe("computePreOrderDepositAmount", () => {
  it("uses the product's own preOrderDepositPercent when set", () => {
    // 1000 paise * 25% = 250
    const result = computePreOrderDepositAmount([line(1, 1000, 25)], 10);
    expect(result).toBe(250);
  });

  it("falls back to the default (generic COD) deposit percent when unset on the product", () => {
    // 1000 paise * 10% (default) = 100
    const result = computePreOrderDepositAmount([line(1, 1000, undefined)], 10);
    expect(result).toBe(100);
  });

  it("sums per-line deposits when a group mixes products with different configured percentages", () => {
    // line1: 1000 * 25% = 250; line2: 2000 * 10% (default) = 200 → 450
    const result = computePreOrderDepositAmount(
      [line(1, 1000, 25), line(1, 2000, undefined)],
      10,
    );
    expect(result).toBe(450);
  });

  it("accounts for quantity > 1", () => {
    // 3 * 1000 paise * 20% = 600
    const result = computePreOrderDepositAmount([line(3, 1000, 20)], 10);
    expect(result).toBe(600);
  });

  it("returns 0 for an empty group", () => {
    expect(computePreOrderDepositAmount([], 10)).toBe(0);
  });
});
