import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockOrderListAll,
  mockProductList,
  mockProductFindById,
  mockStoreFindByOwnerId,
} = vi.hoisted(() => ({
  mockOrderListAll: vi.fn(),
  mockProductList: vi.fn(),
  mockProductFindById: vi.fn(),
  mockStoreFindByOwnerId: vi.fn(),
}));

vi.mock("../../../../../repositories", () => ({
  orderRepository: { listAll: mockOrderListAll },
  productRepository: { list: mockProductList, findById: mockProductFindById },
  storeRepository: { findByOwnerId: mockStoreFindByOwnerId },
}));

import { runStoreAnalytics } from "../storeAnalytics";
import type { JobContext } from "../../runtime/types";

function makeCtx(): JobContext {
  return {
    db: {} as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

function makeOrder(overrides: { productId?: string; totalPrice?: number; createdAt?: string } = {}) {
  return {
    productId: overrides.productId ?? "product-1",
    productTitle: "Test Product",
    totalPrice: overrides.totalPrice ?? 50000,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockStoreFindByOwnerId.mockResolvedValue({ id: "store-palace", ownerId: "seller-1" });
  mockOrderListAll.mockResolvedValue({ items: [], hasMore: false, total: 0 });
  mockProductList.mockResolvedValue({ items: [], total: 0, hasMore: false });
  mockProductFindById.mockResolvedValue({ id: "product-1", mainImage: "" });
});

describe("runStoreAnalytics — missing sellerId", () => {
  it("throws when sellerId is not provided", async () => {
    const ctx = makeCtx();
    await expect(runStoreAnalytics({ sellerId: "" }, ctx)).rejects.toThrow(/sellerId is required/i);
  });
});

describe("runStoreAnalytics — store not found", () => {
  it("throws 404 error when store not found for sellerId", async () => {
    mockStoreFindByOwnerId.mockResolvedValue(null);
    const ctx = makeCtx();
    await expect(runStoreAnalytics({ sellerId: "seller-unknown" }, ctx)).rejects.toThrow(/store not found/i);
  });
});

describe("runStoreAnalytics — store with no orders", () => {
  it("returns zero totalOrders and totalRevenue", async () => {
    const ctx = makeCtx();
    const result = await runStoreAnalytics({ sellerId: "seller-1" }, ctx);
    expect(result.summary.totalOrders).toBe(0);
    expect(result.summary.totalRevenue).toBe(0);
  });

  it("returns 6 months in revenueByMonth with zero counts", async () => {
    const ctx = makeCtx();
    const result = await runStoreAnalytics({ sellerId: "seller-1" }, ctx);
    expect(result.revenueByMonth).toHaveLength(6);
    for (const entry of result.revenueByMonth) {
      expect(entry.orders).toBe(0);
      expect(entry.revenue).toBe(0);
    }
  });

  it("returns empty topProducts array", async () => {
    const ctx = makeCtx();
    const result = await runStoreAnalytics({ sellerId: "seller-1" }, ctx);
    expect(result.topProducts).toHaveLength(0);
  });
});

describe("runStoreAnalytics — aggregates revenue correctly", () => {
  it("sums totalRevenue across all orders", async () => {
    mockOrderListAll.mockResolvedValue({
      items: [makeOrder({ totalPrice: 100000 }), makeOrder({ totalPrice: 50000 })],
      hasMore: false,
    });
    const ctx = makeCtx();
    const result = await runStoreAnalytics({ sellerId: "seller-1" }, ctx);
    expect(result.summary.totalOrders).toBe(2);
    expect(result.summary.totalRevenue).toBe(150000);
  });

  it("groups revenue by product for topProducts", async () => {
    mockOrderListAll.mockResolvedValue({
      items: [
        makeOrder({ productId: "product-a", totalPrice: 200000 }),
        makeOrder({ productId: "product-a", totalPrice: 100000 }),
        makeOrder({ productId: "product-b", totalPrice: 50000 }),
      ],
      hasMore: false,
    });
    mockProductFindById.mockResolvedValue({ id: "product-a", mainImage: "image.jpg" });
    const ctx = makeCtx();
    const result = await runStoreAnalytics({ sellerId: "seller-1" }, ctx);
    expect(result.topProducts[0].productId).toBe("product-a");
    expect(result.topProducts[0].revenue).toBe(300000);
    expect(result.topProducts[0].orders).toBe(2);
  });

  it("limits topProducts to 5 entries", async () => {
    const orders = ["p1","p2","p3","p4","p5","p6"].map((pid, i) =>
      makeOrder({ productId: pid, totalPrice: (6 - i) * 10000 }),
    );
    mockOrderListAll.mockResolvedValue({ items: orders, hasMore: false });
    mockProductFindById.mockResolvedValue({ id: "x", mainImage: "" });
    const ctx = makeCtx();
    const result = await runStoreAnalytics({ sellerId: "seller-1" }, ctx);
    expect(result.topProducts.length).toBeLessThanOrEqual(5);
  });
});

describe("runStoreAnalytics — revenueByMonth is populated", () => {
  it("places order into correct month bucket", async () => {
    const orderDate = new Date();
    orderDate.setDate(1);
    mockOrderListAll.mockResolvedValue({
      items: [makeOrder({ totalPrice: 75000, createdAt: orderDate.toISOString() })],
      hasMore: false,
    });
    const ctx = makeCtx();
    const result = await runStoreAnalytics({ sellerId: "seller-1" }, ctx);
    const currentMonthEntry = result.revenueByMonth[result.revenueByMonth.length - 1];
    expect(currentMonthEntry.orders).toBe(1);
    expect(currentMonthEntry.revenue).toBe(75000);
  });
});

describe("runStoreAnalytics — product/published counts from repository", () => {
  it("includes totalProducts and publishedProducts from repository results", async () => {
    mockProductList
      .mockResolvedValueOnce({ items: [], total: 15, hasMore: false })
      .mockResolvedValueOnce({ items: [], total: 10, hasMore: false });
    const ctx = makeCtx();
    const result = await runStoreAnalytics({ sellerId: "seller-1" }, ctx);
    expect(result.summary.totalProducts).toBe(15);
    expect(result.summary.publishedProducts).toBe(10);
  });
});
