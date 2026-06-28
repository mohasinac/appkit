import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockProductList,
  mockCouponsList,
} = vi.hoisted(() => ({
  mockProductList: vi.fn(),
  mockCouponsList: vi.fn(),
}));

vi.mock("../../../../../repositories", () => ({
  productRepository: { list: mockProductList },
  couponsRepository: { list: mockCouponsList },
}));

import { runPromotions } from "../promotions";
import type { JobContext } from "../../runtime/types";

function makeCtx(): JobContext {
  return {
    db: {} as unknown as JobContext["db"],
    now: new Date("2026-01-15T12:00:00Z"),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

function makePagedResult(items: unknown[] = []) {
  return { items, total: items.length, hasMore: false };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockProductList.mockResolvedValue(makePagedResult([]));
  mockCouponsList.mockResolvedValue(makePagedResult([]));
});

describe("runPromotions — all queries succeed", () => {
  it("returns promotedProducts, featuredProducts, and activeCoupons", async () => {
    mockProductList
      .mockResolvedValueOnce(makePagedResult([{ id: "product-1", isPromoted: true }]))
      .mockResolvedValueOnce(makePagedResult([{ id: "product-2", isFeatured: true }]));
    const ctx = makeCtx();
    const result = await runPromotions(undefined, ctx);
    expect(result.promotedProducts).toHaveLength(1);
    expect(result.featuredProducts).toHaveLength(1);
  });

  it("does not set partial:true when all queries succeed", async () => {
    const ctx = makeCtx();
    const result = await runPromotions(undefined, ctx);
    expect(result.partial).toBeUndefined();
  });
});

describe("runPromotions — coupon startDate filtering", () => {
  it("includes coupons with no startDate in activeCoupons", async () => {
    const coupon = { id: "coupon-1", validity: { isActive: true, endDate: "2027-01-01" } };
    mockCouponsList.mockResolvedValue(makePagedResult([coupon]));
    const ctx = makeCtx();
    const result = await runPromotions(undefined, ctx);
    expect(result.activeCoupons).toHaveLength(1);
  });

  it("includes coupons where startDate is in the past", async () => {
    const coupon = {
      id: "coupon-2",
      validity: { isActive: true, startDate: "2025-01-01", endDate: "2027-01-01" },
    };
    mockCouponsList.mockResolvedValue(makePagedResult([coupon]));
    const ctx = makeCtx();
    const result = await runPromotions(undefined, ctx);
    expect(result.activeCoupons).toHaveLength(1);
  });

  it("excludes coupons where startDate is in the future", async () => {
    const coupon = {
      id: "coupon-3",
      validity: { isActive: true, startDate: "2027-01-01", endDate: "2028-01-01" },
    };
    mockCouponsList.mockResolvedValue(makePagedResult([coupon]));
    const ctx = makeCtx();
    const result = await runPromotions(undefined, ctx);
    expect(result.activeCoupons).toHaveLength(0);
  });
});

describe("runPromotions — partial failures", () => {
  it("returns partial:true when promoted products query fails", async () => {
    mockProductList
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(makePagedResult([]));
    const ctx = makeCtx();
    const result = await runPromotions(undefined, ctx);
    expect(result.partial).toBe(true);
  });

  it("returns empty array for failed queries without throwing", async () => {
    mockProductList.mockRejectedValue(new Error("Firestore unavailable"));
    mockCouponsList.mockRejectedValue(new Error("Firestore unavailable"));
    const ctx = makeCtx();
    const result = await runPromotions(undefined, ctx);
    expect(result.promotedProducts).toHaveLength(0);
    expect(result.featuredProducts).toHaveLength(0);
    expect(result.activeCoupons).toHaveLength(0);
    expect(result.partial).toBe(true);
  });

  it("logs warning when partial", async () => {
    mockProductList.mockRejectedValue(new Error("fail"));
    const ctx = makeCtx();
    await runPromotions(undefined, ctx);
    expect(ctx.logger.warn).toHaveBeenCalled();
  });
});
