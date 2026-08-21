import { describe, it, expect } from "vitest";
import { detectCouponConflict } from "../coupon-stacking";
import type { CartAppliedCoupon } from "../../../cart/schemas/firestore";

function applied(overrides: Partial<CartAppliedCoupon>): CartAppliedCoupon {
  return { code: "CODE", discountAmount: 0, scope: "admin", ...overrides };
}

describe("detectCouponConflict — allowed stacks", () => {
  it("empty existing array → always null", () => {
    expect(detectCouponConflict([], { code: "NEW10", scope: "admin" })).toBeNull();
  });

  it("two seller coupons from different stores → null", () => {
    const existing = [applied({ scope: "seller", storeId: "store-A" })];
    expect(
      detectCouponConflict(existing, {
        code: "OTHER",
        scope: "seller",
        storeId: "store-B",
      }),
    ).toBeNull();
  });

  it("admin coupon on top of a seller coupon → null", () => {
    const existing = [applied({ scope: "seller", storeId: "store-A" })];
    expect(
      detectCouponConflict(existing, { code: "ADMIN10", scope: "admin" }),
    ).toBeNull();
  });

  it("seller coupon on top of an admin coupon → null", () => {
    const existing = [applied({ scope: "admin", code: "ADMIN10" })];
    expect(
      detectCouponConflict(existing, {
        code: "SELLER10",
        scope: "seller",
        storeId: "store-A",
      }),
    ).toBeNull();
  });

  it("the full target shape — one coupon per store + one global → null", () => {
    const existing = [
      applied({ scope: "seller", code: "ARENA25", storeId: "store-A" }),
      applied({ scope: "seller", code: "OFFICIAL10", storeId: "store-B" }),
    ];
    expect(
      detectCouponConflict(existing, { code: "FREESHIP499", scope: "admin" }),
    ).toBeNull();
  });
});

describe("detectCouponConflict — rejected stacks", () => {
  it("same code already applied → conflict naming the code", () => {
    const existing = [applied({ code: "WELCOME10", scope: "admin" })];
    const result = detectCouponConflict(existing, {
      code: "WELCOME10",
      scope: "admin",
    });
    expect(result).toContain("WELCOME10");
  });

  it("second seller coupon for the same store → conflict naming the applied code", () => {
    const existing = [
      applied({ scope: "seller", code: "STORE20", storeId: "store-A" }),
    ];
    const result = detectCouponConflict(existing, {
      code: "STORE30",
      scope: "seller",
      storeId: "store-A",
    });
    expect(result).toContain("STORE20");
  });

  it("second admin coupon → conflict (only one platform-wide coupon)", () => {
    const existing = [applied({ scope: "admin", code: "ADMIN1" })];
    const result = detectCouponConflict(existing, {
      code: "ADMIN2",
      scope: "admin",
    });
    expect(result).toContain("ADMIN1");
    expect(result).toContain("platform-wide");
  });

  it("second admin coupon is rejected even alongside seller coupons", () => {
    const existing = [
      applied({ scope: "seller", code: "ARENA25", storeId: "store-A" }),
      applied({ scope: "admin", code: "FREESHIP499" }),
    ];
    const result = detectCouponConflict(existing, {
      code: "BLADER50",
      scope: "admin",
    });
    expect(result).toContain("FREESHIP499");
  });
});
