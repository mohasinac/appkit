/**
 * Money invariants for multi-member cart lines.
 *
 * These are the assertions that cannot be checked by reading: every one of them
 * guards a way the numbers can silently disagree while everything still renders
 * and nothing throws.
 */
import { describe, it, expect } from "vitest";
import {
  unitPriceFor,
  lineTotalFor,
  lineTaxComponentsFor,
  allocateAcrossMembers,
  sumGroupGst,
} from "../../../../shared/checkout/order-math";
import {
  getCartLineMembers,
  isMultiMemberLine,
} from "../../../../shared/checkout/line-members";
import { expandCartLineToOrderRows } from "../expand-order-items";
import type { CartItemDocument } from "../../../../../features/cart/schemas/firestore";
import type { ProductDocument } from "../../../../../features/products/schemas/firestore";

const product = (id: string, price: number, gstRate: 0 | 5 | 12 | 18 | 28) =>
  ({ id, price, gstRate, title: id, status: "published", availableQuantity: 99 } as unknown as ProductDocument);

const products = new Map<string, ProductDocument>([
  ["a", product("a", 199, 18)],
  ["b", product("b", 149, 18)],
  ["c", product("c", 99, 12)],
]);

const line = (over: Partial<CartItemDocument>) =>
  ({ itemId: "i", productId: "a", price: 0, currency: "INR", quantity: 1, storeId: "s", storeName: "S", listingType: "standard", productTitle: "t", productImage: "", addedAt: new Date(), updatedAt: new Date(), ...over } as CartItemDocument);

describe("unitPriceFor / lineTotalFor", () => {
  it("a plain line charges the LIVE product price", () => {
    expect(lineTotalFor(line({ productId: "a", price: 150, quantity: 3 }), products.get("a")!)).toBe(597);
  });

  it("a locked price beats the listing price — the Razorpay bug", () => {
    // Three hand-rolled copies of this rule omitted the lockedPrice branch, so
    // an accepted offer was captured at the seller's list price.
    const offer = line({ productId: "a", price: 199, quantity: 2, lockedPrice: 120, offerId: "o1" });
    expect(lineTotalFor(offer, products.get("a")!)).toBe(240);
  });

  it("a BUNDLE keeps its discount and never sums its members", () => {
    // The bundle branch must be evaluated BEFORE the members branch: a bundle
    // line carries groupMembers too, and summing them (199+149=348) would throw
    // away the discount that is the entire point of a bundle.
    const bundle = line({
      productId: "bundle-x", price: 199, quantity: 2, lineKind: "bundle",
      bundleCategorySlug: "bundle-x",
      groupMembers: [
        { productId: "a", quantity: 1, unitPrice: 199, title: "A", gstRate: 18 },
        { productId: "b", quantity: 1, unitPrice: 149, title: "B", gstRate: 18 },
      ],
    });
    expect(unitPriceFor(bundle, null)).toBe(199);
    expect(lineTotalFor(bundle, null)).toBe(398);
  });

  it("a GROUP line is exactly the sum of what the buyer picked", () => {
    const group = line({
      productId: "grp", quantity: 1, lineKind: "group", groupSource: "product-group",
      groupMembers: [
        { productId: "a", quantity: 2, unitPrice: 199, title: "A", gstRate: 18 },
        { productId: "c", quantity: 1, unitPrice: 99, title: "C", gstRate: 12 },
      ],
    });
    expect(lineTotalFor(group, null)).toBe(497);
  });

  it("a legacy bundle line (no groupMembers) behaves exactly as before", () => {
    const legacy = line({
      productId: "bundle-x", price: 199, quantity: 2,
      bundleCategorySlug: "bundle-x", bundleProductIds: ["a", "b"],
    });
    expect(lineTotalFor(legacy, null)).toBe(398);
    expect(isMultiMemberLine(legacy)).toBe(true);
    expect(getCartLineMembers(legacy)).toEqual([
      { productId: "a", quantity: 1 },
      { productId: "b", quantity: 1 },
    ]);
  });
});

describe("stock fan-out is quantity-weighted", () => {
  it("a member wanted 2-per-copy resolves at 2, not 1", () => {
    const group = line({
      groupMembers: [{ productId: "a", quantity: 2, unitPrice: 199, title: "A" }],
    });
    expect(getCartLineMembers(group)[0].quantity).toBe(2);
  });
});

describe("per-member GST", () => {
  const group = line({
    productId: "grp", quantity: 1, lineKind: "group",
    groupMembers: [
      { productId: "a", quantity: 2, unitPrice: 199, title: "A", gstRate: 18 },
      { productId: "c", quantity: 1, unitPrice: 99, title: "C", gstRate: 12 },
    ],
  });

  it("slices reconcile with the line total", () => {
    const slices = lineTaxComponentsFor(group, products);
    expect(slices.reduce((s, x) => s + x.taxable, 0)).toBeCloseTo(497, 2);
  });

  it("each member is taxed at its OWN rate", () => {
    const slices = lineTaxComponentsFor(group, products);
    expect(slices.find((s) => s.productId === "a")!.gstRate).toBe(18);
    expect(slices.find((s) => s.productId === "c")!.gstRate).toBe(12);
    expect(sumGroupGst([group], products, true).gstAmount).toBeCloseTo(398 * 0.18 + 99 * 0.12, 2);
  });

  it("a bundle is taxed on its DISCOUNTED price, and is no longer tax-free", () => {
    const bundle = line({
      productId: "bundle-x", price: 199, quantity: 2, lineKind: "bundle",
      bundleCategorySlug: "bundle-x",
      groupMembers: [
        { productId: "a", quantity: 1, unitPrice: 199, title: "A", gstRate: 18 },
        { productId: "b", quantity: 1, unitPrice: 149, title: "B", gstRate: 18 },
      ],
    });
    const slices = lineTaxComponentsFor(bundle, products);
    // Not 696 (the undiscounted 348 x 2) — the buyer never pays that.
    expect(slices.reduce((s, x) => s + x.taxable, 0)).toBeCloseTo(398, 2);
    expect(sumGroupGst([bundle], products, true).gstAmount).toBeGreaterThan(0);
  });
});

describe("allocateAcrossMembers", () => {
  it("always reconciles to the total, including on an inexact split", () => {
    expect(allocateAcrossMembers(100, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);
    expect(allocateAcrossMembers(0.05, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBeCloseTo(0.05, 2);
  });

  it("falls back to an even split when every weight is zero", () => {
    expect(allocateAcrossMembers(50, [0, 0]).reduce((a, b) => a + b, 0)).toBeCloseTo(50, 2);
  });
});

describe("order-row expansion", () => {
  it("a plain line still produces exactly one row", () => {
    const rows = expandCartLineToOrderRows(line({ productId: "a", quantity: 3 }), products.get("a")!, products);
    expect(rows).toHaveLength(1);
    expect(rows[0].totalPrice).toBe(597);
  });

  it("a grouped line produces one row per member that reconciles", () => {
    const group = line({
      productId: "grp", quantity: 1, lineKind: "group", groupSlug: "grp", groupTitle: "Set",
      groupMembers: [
        { productId: "a", quantity: 2, unitPrice: 199, title: "A", gstRate: 18 },
        { productId: "c", quantity: 1, unitPrice: 99, title: "C", gstRate: 12 },
      ],
    });
    const rows = expandCartLineToOrderRows(group, products.get("a")!, products);
    expect(rows).toHaveLength(2);
    expect(rows.reduce((s, r) => s + r.totalPrice, 0)).toBeCloseTo(497, 2);
    expect(rows.every((r) => r.groupSlug === "grp")).toBe(true);
    // Per-product HSN/rate is the reason rows are expanded at all.
    expect(rows.map((r) => r.gstRate).sort()).toEqual([12, 18]);
    expect(rows.find((r) => r.productId === "a")!.quantity).toBe(2);
  });

  it("bundle rows sum to the discounted total, not the members' list prices", () => {
    const bundle = line({
      productId: "bundle-x", price: 199, quantity: 2, lineKind: "bundle",
      bundleCategorySlug: "bundle-x", groupTitle: "Test Bundle",
      groupMembers: [
        { productId: "a", quantity: 1, unitPrice: 199, title: "A", gstRate: 18 },
        { productId: "b", quantity: 1, unitPrice: 149, title: "B", gstRate: 18 },
      ],
    });
    const rows = expandCartLineToOrderRows(bundle, products.get("a")!, products);
    expect(rows).toHaveLength(2);
    expect(rows.reduce((s, r) => s + r.totalPrice, 0)).toBeCloseTo(398, 2);
    expect(rows.every((r) => r.bundleCategorySlug === "bundle-x")).toBe(true);
  });
});
