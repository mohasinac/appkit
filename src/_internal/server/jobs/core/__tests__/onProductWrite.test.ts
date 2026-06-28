import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUpdateMetricsInBatch,
  mockCategoriesFindById,
  mockIncrementTotalProducts,
} = vi.hoisted(() => ({
  mockUpdateMetricsInBatch: vi.fn(),
  mockCategoriesFindById: vi.fn(),
  mockIncrementTotalProducts: vi.fn(),
}));

vi.mock("../../../../../repositories", () => ({
  categoriesRepository: {
    updateMetricsInBatch: mockUpdateMetricsInBatch,
    findById: mockCategoriesFindById,
  },
  storeRepository: {
    incrementTotalProducts: mockIncrementTotalProducts,
  },
}));

vi.mock("../../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));

import { handleProductWrite } from "../onProductWrite";
import type { JobContext } from "../../runtime/types";

function makeBatch() {
  return { commit: vi.fn().mockResolvedValue(undefined), update: vi.fn(), set: vi.fn(), delete: vi.fn() };
}

function makeCtx(): JobContext {
  const batch = makeBatch();
  return {
    db: { batch: vi.fn(() => batch) } as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCategoriesFindById.mockResolvedValue({ parentIds: [] });
  mockUpdateMetricsInBatch.mockReturnValue(undefined);
  mockIncrementTotalProducts.mockResolvedValue(undefined);
});

describe("handleProductWrite — draft → published (publish event)", () => {
  it("increments category metrics and store product count", async () => {
    const ctx = makeCtx();
    await handleProductWrite(
      {
        productId: "product-1",
        before: { status: "draft", category: "category-trading-cards", storeId: "store-palace", listingType: "standard" },
        after: { status: "published", category: "category-trading-cards", storeId: "store-palace", listingType: "standard" },
      },
      ctx,
    );
    expect(mockUpdateMetricsInBatch).toHaveBeenCalledWith(
      expect.anything(), "category-trading-cards", [], 1, 0, "product-1",
    );
    expect(mockIncrementTotalProducts).toHaveBeenCalledWith("store-palace", 1);
  });
});

describe("handleProductWrite — published → draft (unpublish event)", () => {
  it("decrements category metrics and store product count", async () => {
    const ctx = makeCtx();
    await handleProductWrite(
      {
        productId: "product-2",
        before: { status: "published", category: "category-cards", storeId: "store-a", listingType: "standard" },
        after: { status: "draft", category: "category-cards", storeId: "store-a", listingType: "standard" },
      },
      ctx,
    );
    expect(mockUpdateMetricsInBatch).toHaveBeenCalledWith(
      expect.anything(), "category-cards", [], -1, 0, "product-2",
    );
    expect(mockIncrementTotalProducts).toHaveBeenCalledWith("store-a", -1);
  });
});

describe("handleProductWrite — DELETE of a published product", () => {
  it("decrements counters when before=published and after=null", async () => {
    const ctx = makeCtx();
    await handleProductWrite(
      {
        productId: "product-del",
        before: { status: "published", category: "category-action", storeId: "store-b", listingType: "standard" },
        after: null,
      },
      ctx,
    );
    expect(mockUpdateMetricsInBatch).toHaveBeenCalledWith(
      expect.anything(), "category-action", [], -1, 0, "product-del",
    );
    expect(mockIncrementTotalProducts).toHaveBeenCalledWith("store-b", -1);
  });

  it("does NOT call incrementTotalProducts when deleted product has no storeId", async () => {
    const ctx = makeCtx();
    await handleProductWrite(
      {
        productId: "product-no-store",
        before: { status: "published", category: "category-cards", listingType: "standard" },
        after: null,
      },
      ctx,
    );
    expect(mockIncrementTotalProducts).not.toHaveBeenCalled();
  });
});

describe("handleProductWrite — category move (published → published, different category)", () => {
  it("decrements old category and increments new category in the same batch", async () => {
    mockCategoriesFindById
      .mockResolvedValueOnce({ parentIds: ["cat-old-parent"] })
      .mockResolvedValueOnce({ parentIds: ["cat-new-parent"] });
    const ctx = makeCtx();
    await handleProductWrite(
      {
        productId: "product-move",
        before: { status: "published", category: "category-old", storeId: "store-c", listingType: "standard" },
        after: { status: "published", category: "category-new", storeId: "store-c", listingType: "standard" },
      },
      ctx,
    );
    expect(mockUpdateMetricsInBatch).toHaveBeenCalledTimes(2);
    const calls = mockUpdateMetricsInBatch.mock.calls;
    const decrement = calls.find(c => c[1] === "category-old");
    const increment = calls.find(c => c[1] === "category-new");
    expect(decrement).toBeDefined();
    expect(increment).toBeDefined();
  });
});

describe("handleProductWrite — no-op scenarios", () => {
  it("does nothing when draft → draft (no publish event)", async () => {
    const ctx = makeCtx();
    await handleProductWrite(
      {
        productId: "product-draft",
        before: { status: "draft", category: "category-a", storeId: "store-x", listingType: "standard" },
        after: { status: "draft", category: "category-a", storeId: "store-x", listingType: "standard" },
      },
      ctx,
    );
    expect(mockUpdateMetricsInBatch).not.toHaveBeenCalled();
    expect(mockIncrementTotalProducts).not.toHaveBeenCalled();
  });

  it("does nothing when delete on a draft product", async () => {
    const ctx = makeCtx();
    await handleProductWrite(
      {
        productId: "product-draft-del",
        before: { status: "draft", category: "category-a", storeId: "store-x", listingType: "standard" },
        after: null,
      },
      ctx,
    );
    expect(mockUpdateMetricsInBatch).not.toHaveBeenCalled();
  });
});

describe("handleProductWrite — auction product", () => {
  it("passes auctionDelta=1 instead of productDelta=1 when listingType=auction", async () => {
    const ctx = makeCtx();
    await handleProductWrite(
      {
        productId: "auction-1",
        before: { status: "draft", category: "category-auctions", storeId: "store-d", listingType: "auction" },
        after: { status: "published", category: "category-auctions", storeId: "store-d", listingType: "auction" },
      },
      ctx,
    );
    expect(mockUpdateMetricsInBatch).toHaveBeenCalledWith(
      expect.anything(), "category-auctions", [], 0, 1, "auction-1",
    );
  });
});

describe("handleProductWrite — error handling", () => {
  it("catches errors and logs them non-fatally without rethrowing", async () => {
    mockCategoriesFindById.mockRejectedValue(new Error("Firestore error"));
    const ctx = makeCtx();
    await expect(
      handleProductWrite(
        {
          productId: "product-error",
          before: { status: "draft", category: "category-err", storeId: "store-e", listingType: "standard" },
          after: { status: "published", category: "category-err", storeId: "store-e", listingType: "standard" },
        },
        ctx,
      ),
    ).resolves.toBeUndefined();
    expect(ctx.logger.error).toHaveBeenCalled();
  });
});
