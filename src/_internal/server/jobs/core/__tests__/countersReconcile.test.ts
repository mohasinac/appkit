import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockCategoriesSetMetrics,
  mockCategoriesFindById,
  mockStoreListIds,
  mockStoreSetStats,
  mockReviewGetAggregate,
} = vi.hoisted(() => ({
  mockCategoriesSetMetrics: vi.fn(),
  mockCategoriesFindById: vi.fn(),
  mockStoreListIds: vi.fn(),
  mockStoreSetStats: vi.fn(),
  mockReviewGetAggregate: vi.fn(),
}));

vi.mock("../../../../../repositories", () => ({
  categoriesRepository: {
    setMetrics: mockCategoriesSetMetrics,
    findById: mockCategoriesFindById,
  },
  storeRepository: {
    listIds: mockStoreListIds,
    setStats: mockStoreSetStats,
  },
  reviewRepository: {
    getApprovedRatingAggregateByStore: mockReviewGetAggregate,
  },
}));

vi.mock("../../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));

import { runCountersReconcile } from "../countersReconcile";
import type { JobContext } from "../../runtime/types";

function makeCtx(productDocs: unknown[] = [], storeDocs: { id: string; ownerId?: string }[] = []) {
  const storeSnaps: Record<string, { exists: boolean; data: () => object }> = {};
  for (const s of storeDocs) {
    storeSnaps[s.id] = { exists: true, data: () => ({ ownerId: s.ownerId ?? "seller-uid" }) };
  }
  const productSnap = {
    size: productDocs.length,
    docs: productDocs,
  };
  const db = {
    collection: vi.fn().mockImplementation((col: string) => {
      if (col === "products") {
        return {
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(productSnap),
        };
      }
      if (col === "stores") {
        return {
          doc: vi.fn().mockImplementation((id: string) => ({
            get: vi.fn().mockResolvedValue(storeSnaps[id] ?? { exists: false, data: () => ({}) }),
          })),
        };
      }
      return {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ size: 0, docs: [] }),
      };
    }),
  };
  return {
    db: db as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCategoriesSetMetrics.mockResolvedValue(undefined);
  mockCategoriesFindById.mockResolvedValue({ parentIds: [] });
  mockStoreListIds.mockResolvedValue([]);
  mockStoreSetStats.mockResolvedValue(undefined);
  mockReviewGetAggregate.mockResolvedValue({ count: 0, avgRating: 0 });
});

describe("runCountersReconcile — categories reconcile", () => {
  it("calls categoriesRepository.setMetrics for each leaf category with products", async () => {
    const productDocs = [
      { id: "product-1", data: () => ({ category: "category-trading-cards", listingType: "standard" }) },
      { id: "product-2", data: () => ({ category: "category-trading-cards", listingType: "standard" }) },
      { id: "product-3", data: () => ({ category: "category-action-figures", listingType: "auction" }) },
    ];
    mockCategoriesFindById.mockResolvedValue({ parentIds: [] });
    const ctx = makeCtx(productDocs);
    await runCountersReconcile(ctx);
    expect(mockCategoriesSetMetrics).toHaveBeenCalledWith(
      "category-trading-cards",
      2, 0,
      expect.arrayContaining(["product-1", "product-2"]),
      [],
    );
    expect(mockCategoriesSetMetrics).toHaveBeenCalledWith(
      "category-action-figures",
      0, 1,
      [],
      ["product-3"],
    );
  });

  it("propagates metrics up to ancestor categories via parentIds", async () => {
    const productDocs = [
      { id: "product-child", data: () => ({ category: "category-child", listingType: "standard" }) },
    ];
    mockCategoriesFindById.mockResolvedValue({ parentIds: ["category-parent"] });
    const ctx = makeCtx(productDocs);
    await runCountersReconcile(ctx);
    // setMetrics called once for leaf + once for ancestor
    expect(mockCategoriesSetMetrics).toHaveBeenCalledTimes(2);
  });

  it("skips products without a category field", async () => {
    const productDocs = [
      { id: "product-nocat", data: () => ({ listingType: "standard" }) },
    ];
    const ctx = makeCtx(productDocs);
    await runCountersReconcile(ctx);
    expect(mockCategoriesSetMetrics).not.toHaveBeenCalled();
  });
});

describe("runCountersReconcile — stores reconcile", () => {
  it("calls storeRepository.setStats for each store", async () => {
    mockStoreListIds.mockResolvedValue(["store-palace"]);
    mockReviewGetAggregate.mockResolvedValue({ count: 10, avgRating: 4.5 });
    const ctx = makeCtx([], [{ id: "store-palace", ownerId: "seller-1" }]);
    await runCountersReconcile(ctx);
    expect(mockStoreSetStats).toHaveBeenCalledWith("store-palace", expect.any(Number), expect.any(Number), 10, 4.5);
  });

  it("passes null for avgRating when count = 0", async () => {
    mockStoreListIds.mockResolvedValue(["store-empty"]);
    mockReviewGetAggregate.mockResolvedValue({ count: 0, avgRating: 0 });
    const ctx = makeCtx([], [{ id: "store-empty", ownerId: "seller-2" }]);
    await runCountersReconcile(ctx);
    expect(mockStoreSetStats).toHaveBeenCalledWith("store-empty", 0, 0, 0, null);
  });

  it("skips stores that don't exist in Firestore", async () => {
    mockStoreListIds.mockResolvedValue(["store-missing"]);
    const ctx = makeCtx([], []);
    await runCountersReconcile(ctx);
    expect(mockStoreSetStats).not.toHaveBeenCalled();
  });
});

describe("runCountersReconcile — failure isolation", () => {
  it("continues stores reconcile even if category reconcile fails", async () => {
    mockCategoriesSetMetrics.mockRejectedValue(new Error("setMetrics error"));
    mockStoreListIds.mockResolvedValue(["store-a"]);
    const ctx = makeCtx(
      [{ id: "p-1", data: () => ({ category: "cat-1", listingType: "standard" }) }],
      [{ id: "store-a" }],
    );
    await runCountersReconcile(ctx);
    // store setStats should still be called even if categories blew up
    expect(mockStoreSetStats).toHaveBeenCalled();
    expect(ctx.logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/category/i),
      expect.any(Error),
    );
  });

  it("logs per-store error when a single store fails but does not abort others", async () => {
    mockStoreListIds.mockResolvedValue(["store-fail", "store-ok"]);
    mockReviewGetAggregate.mockRejectedValueOnce(new Error("review timeout")).mockResolvedValue({ count: 0, avgRating: 0 });
    const ctx = makeCtx([], [{ id: "store-fail" }, { id: "store-ok" }]);
    await runCountersReconcile(ctx);
    expect(ctx.logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/store-fail/),
      expect.any(Error),
    );
    expect(mockStoreSetStats).toHaveBeenCalledWith("store-ok", expect.any(Number), expect.any(Number), 0, null);
  });
});
