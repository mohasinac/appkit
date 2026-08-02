/**
 * Unit tests for promotions/service.ts — validateCoupon + computeDiscount.
 * All Firestore calls are mocked via vi.mock("../../../../repositories").
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetCouponByCode, mockGetUserCouponUsageCount } = vi.hoisted(() => ({
  mockGetCouponByCode:          vi.fn(),
  mockGetUserCouponUsageCount:  vi.fn(),
}));

vi.mock("../../../../../repositories", () => ({
  couponsRepository: {
    getCouponByCode:          mockGetCouponByCode,
    getUserCouponUsageCount:  mockGetUserCouponUsageCount,
  },
}));

import { validateCoupon, computeDiscount } from "../service";

const BUYER_UID = "user-buyer-1";

function makeCoupon(overrides: Record<string, unknown> = {}) {
  return {
    id:        "coupon-welcome10",
    code:      "WELCOME10",
    type:      "percentage",
    scope:     "admin",
    discount:  { value: 10, maxDiscount: 50000, minPurchase: 0 },
    usage:     { totalLimit: 100, perUserLimit: 1, currentUsage: 0 },
    validity:  {
      isActive:  true,
      startDate: new Date("2025-01-01").toISOString(),
      endDate:   new Date("2099-12-31").toISOString(),
    },
    restrictions: {},
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCouponByCode.mockResolvedValue(makeCoupon());
  mockGetUserCouponUsageCount.mockResolvedValue(0);
});

// ---------------------------------------------------------------------------
// validateCoupon
// ---------------------------------------------------------------------------

describe("validateCoupon — happy path", () => {
  it("returns the coupon when all checks pass", async () => {
    const result = await validateCoupon({ code: "WELCOME10", cartTotal: 50000 }, BUYER_UID);
    expect(result.id).toBe("coupon-welcome10");
  });
});

describe("validateCoupon — not found", () => {
  it("throws CouponNotFoundError when code does not exist", async () => {
    mockGetCouponByCode.mockResolvedValue(null);
    await expect(
      validateCoupon({ code: "GHOST", cartTotal: 50000 }, BUYER_UID),
    ).rejects.toThrow("GHOST");
  });

  it("throws CouponNotFoundError when getCouponByCode rejects", async () => {
    mockGetCouponByCode.mockRejectedValue(new Error("DB failure"));
    await expect(
      validateCoupon({ code: "WELCOME10", cartTotal: 50000 }, BUYER_UID),
    ).rejects.toMatchObject({ name: "CouponNotFoundError" });
  });
});

describe("validateCoupon — inactive / expired", () => {
  it("throws CouponExpiredError when isActive is false", async () => {
    mockGetCouponByCode.mockResolvedValue(
      makeCoupon({ validity: { isActive: false, startDate: "2025-01-01", endDate: "2099-12-31" } }),
    );
    await expect(
      validateCoupon({ code: "WELCOME10", cartTotal: 50000 }, BUYER_UID),
    ).rejects.toMatchObject({ name: "CouponExpiredError" });
  });

  it("throws CouponExpiredError when current date is before startDate", async () => {
    mockGetCouponByCode.mockResolvedValue(
      makeCoupon({ validity: { isActive: true, startDate: "2099-01-01", endDate: "2100-12-31" } }),
    );
    await expect(
      validateCoupon({ code: "WELCOME10", cartTotal: 50000 }, BUYER_UID),
    ).rejects.toMatchObject({ name: "CouponExpiredError" });
  });

  it("throws CouponExpiredError when current date is past endDate", async () => {
    mockGetCouponByCode.mockResolvedValue(
      makeCoupon({ validity: { isActive: true, startDate: "2020-01-01", endDate: "2021-12-31" } }),
    );
    await expect(
      validateCoupon({ code: "WELCOME10", cartTotal: 50000 }, BUYER_UID),
    ).rejects.toMatchObject({ name: "CouponExpiredError" });
  });
});

describe("validateCoupon — usage limits", () => {
  it("throws CouponUsageLimitError when totalLimit is reached", async () => {
    mockGetCouponByCode.mockResolvedValue(
      makeCoupon({ usage: { totalLimit: 5, perUserLimit: 1, currentUsage: 5 } }),
    );
    await expect(
      validateCoupon({ code: "WELCOME10", cartTotal: 50000 }, BUYER_UID),
    ).rejects.toMatchObject({ name: "CouponUsageLimitError" });
  });

  it("throws CouponPerUserLimitError when per-user limit is exceeded", async () => {
    mockGetUserCouponUsageCount.mockResolvedValue(1); // already used once
    mockGetCouponByCode.mockResolvedValue(
      makeCoupon({ usage: { totalLimit: 100, perUserLimit: 1, currentUsage: 1 } }),
    );
    await expect(
      validateCoupon({ code: "WELCOME10", cartTotal: 50000 }, BUYER_UID),
    ).rejects.toMatchObject({ name: "CouponPerUserLimitError" });
  });

  it("allows usage when count is below per-user limit", async () => {
    mockGetUserCouponUsageCount.mockResolvedValue(1);
    mockGetCouponByCode.mockResolvedValue(
      makeCoupon({ usage: { totalLimit: 100, perUserLimit: 3, currentUsage: 10 } }),
    );
    await expect(
      validateCoupon({ code: "WELCOME10", cartTotal: 50000 }, BUYER_UID),
    ).resolves.toBeDefined();
  });
});

describe("validateCoupon — minimum purchase", () => {
  it("throws CouponMinPurchaseError when cartTotal is below minPurchase", async () => {
    mockGetCouponByCode.mockResolvedValue(
      makeCoupon({ discount: { value: 10, maxDiscount: 50000, minPurchase: 100000 } }),
    );
    await expect(
      validateCoupon({ code: "WELCOME10", cartTotal: 50000 }, BUYER_UID),
    ).rejects.toMatchObject({ name: "CouponMinPurchaseError" });
  });

  it("passes when cartTotal equals minPurchase exactly", async () => {
    mockGetCouponByCode.mockResolvedValue(
      makeCoupon({ discount: { value: 10, maxDiscount: 50000, minPurchase: 50000 } }),
    );
    await expect(
      validateCoupon({ code: "WELCOME10", cartTotal: 50000 }, BUYER_UID),
    ).resolves.toBeDefined();
  });
});

describe("validateCoupon — first-time-user restriction", () => {
  it("throws CouponScopeError when firstTimeUserOnly and user is not first-time", async () => {
    mockGetCouponByCode.mockResolvedValue(
      makeCoupon({ restrictions: { firstTimeUserOnly: true } }),
    );
    await expect(
      validateCoupon({ code: "WELCOME10", cartTotal: 50000, isFirstTimeUser: false }, BUYER_UID),
    ).rejects.toMatchObject({ name: "CouponScopeError" });
  });

  it("allows first-time user to use firstTimeUserOnly coupon", async () => {
    mockGetCouponByCode.mockResolvedValue(
      makeCoupon({ restrictions: { firstTimeUserOnly: true } }),
    );
    await expect(
      validateCoupon({ code: "WELCOME10", cartTotal: 50000, isFirstTimeUser: true }, BUYER_UID),
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// computeDiscount
// ---------------------------------------------------------------------------

describe("computeDiscount", () => {
  it("percentage type: applies percentage to cartTotal", () => {
    const coupon = makeCoupon({ type: "percentage", discount: { value: 10, minPurchase: 0 } });
    expect(computeDiscount(coupon as never, 100000)).toBe(10000);
  });

  it("percentage type: caps discount at maxDiscount", () => {
    const coupon = makeCoupon({ type: "percentage", discount: { value: 50, maxDiscount: 20000, minPurchase: 0 } });
    expect(computeDiscount(coupon as never, 100000)).toBe(20000);
  });

  it("fixed type: applies flat discount", () => {
    const coupon = makeCoupon({ type: "fixed", discount: { value: 5000, minPurchase: 0 } });
    expect(computeDiscount(coupon as never, 50000)).toBe(5000);
  });

  it("fixed type: cannot discount more than cartTotal", () => {
    const coupon = makeCoupon({ type: "fixed", discount: { value: 99999, minPurchase: 0 } });
    expect(computeDiscount(coupon as never, 50000)).toBe(50000);
  });

  it("free_shipping type: returns 0 (handled separately)", () => {
    const coupon = makeCoupon({ type: "free_shipping", discount: { value: 0, minPurchase: 0 } });
    expect(computeDiscount(coupon as never, 50000)).toBe(0);
  });
});
