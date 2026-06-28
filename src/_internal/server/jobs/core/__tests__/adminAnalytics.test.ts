import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockOrderListAll,
  mockProductList,
  mockProductFindById,
} = vi.hoisted(() => ({
  mockOrderListAll: vi.fn(),
  mockProductList: vi.fn(),
  mockProductFindById: vi.fn(),
}));

vi.mock("../../../../../repositories", () => ({
  orderRepository: { listAll: mockOrderListAll },
  productRepository: { list: mockProductList, findById: mockProductFindById },
}));

import { runAdminAnalytics } from "../adminAnalytics";
import type { JobContext } from "../../runtime/types";

function makeCtx() {
  return {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

function makeOrder(overrides = {}) {
  return {
    id: "order-1",
    productId: "product-charizard",
    productTitle: "Charizard PSA 9",
    totalPrice: 50000,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockOrderListAll.mockResolvedValue({ items: [], total: 0, hasMore: false });
  mockProductList.mockResolvedValue({ items: [], total: 0, hasMore: false });
  mockProductFindById.mockResolvedValue(null);
});

describe("runAdminAnalytics — no orders", () => {
  it("returns zeros when no orders exist", async () => {
    const result = await runAdminAnalytics(undefined, makeCtx());
    expect(result.summary.totalOrders).toBe(0);
    expect(result.summary.totalRevenue).toBe(0);
    expect(result.summary.newOrdersThisMonth).toBe(0);
  });

  it("still returns 12-month ordersByMonth array", async () => {
    const result = await runAdminAnalytics(undefined, makeCtx());
    expect(result.ordersByMonth).toHaveLength(12);
  });

  it("returns empty topProducts array", async () => {
    const result = await runAdminAnalytics(undefined, makeCtx());
    expect(result.topProducts).toHaveLength(0);
  });
});

describe("runAdminAnalytics — with orders", () => {
  beforeEach(() => {
    const order1 = makeOrder({ productId: "product-a", totalPrice: 30000 });
    const order2 = makeOrder({ productId: "product-b", totalPrice: 20000 });
    mockOrderListAll
      .mockResolvedValueOnce({ items: [], total: 2, hasMore: false }) // allTimeTotals count
      .mockResolvedValue({ items: [order1, order2], total: 2, hasMore: false }); // past12 + thisMonth
    mockProductFindById.mockResolvedValue({ id: "product-a", mainImage: "/media/img.jpg" });
  });

  it("sums totalRevenue from past 12 months", async () => {
    const result = await runAdminAnalytics(undefined, makeCtx());
    expect(result.summary.totalRevenue).toBe(50000);
  });

  it("reports allTimeTotals.total as totalOrders", async () => {
    const result = await runAdminAnalytics(undefined, makeCtx());
    expect(result.summary.totalOrders).toBe(2);
  });

  it("groups orders by product for top products", async () => {
    const result = await runAdminAnalytics(undefined, makeCtx());
    expect(result.topProducts.length).toBeGreaterThan(0);
  });

  it("uses publishedProducts count from productRepository", async () => {
    mockProductList
      .mockResolvedValueOnce({ items: [], total: 10, hasMore: false }) // totalProducts
      .mockResolvedValueOnce({ items: [], total: 7, hasMore: false }); // publishedProducts
    const result = await runAdminAnalytics(undefined, makeCtx());
    expect(result.summary.totalProducts).toBe(10);
    expect(result.summary.publishedProducts).toBe(7);
  });
});

describe("runAdminAnalytics — top products limit", () => {
  it("returns at most 5 top products", async () => {
    const orders = Array.from({ length: 10 }, (_, i) =>
      makeOrder({ productId: `product-${i}`, totalPrice: 1000 }),
    );
    mockOrderListAll.mockResolvedValue({ items: orders, total: 10, hasMore: false });
    mockProductFindById.mockResolvedValue(null);

    const result = await runAdminAnalytics(undefined, makeCtx());
    expect(result.topProducts.length).toBeLessThanOrEqual(5);
  });
});
