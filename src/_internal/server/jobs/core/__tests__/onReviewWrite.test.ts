import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetRatingAggregate,
  mockGetRatingAggregateByStore,
  mockProductUpdate,
  mockUpdateReviewStats,
} = vi.hoisted(() => ({
  mockGetRatingAggregate: vi.fn(),
  mockGetRatingAggregateByStore: vi.fn(),
  mockProductUpdate: vi.fn().mockResolvedValue(undefined),
  mockUpdateReviewStats: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../../../repositories", () => ({
  reviewRepository: {
    getApprovedRatingAggregate: mockGetRatingAggregate,
    getApprovedRatingAggregateByStore: mockGetRatingAggregateByStore,
  },
  storeRepository: {
    updateReviewStats: mockUpdateReviewStats,
  },
}));

vi.mock("../../../../../features/reviews/schemas/firestore", () => ({
  ReviewStatusValues: {
    APPROVED: "approved",
    PENDING: "pending",
    REJECTED: "rejected",
  },
}));

vi.mock("../../../../../features/products/schemas/firestore", () => ({
  PRODUCT_COLLECTION: "products",
}));

import { handleReviewWrite } from "../onReviewWrite";
import type { JobContext } from "../../runtime/types";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx() {
  return {
    db: {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          update: mockProductUpdate,
        }),
      }),
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

function makeReviewData(overrides = {}) {
  return {
    productId: "product-charizard",
    storeId: "store-A",
    buyerId: "user-ravi",
    rating: 5,
    status: "approved",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockProductUpdate.mockResolvedValue(undefined);
  mockUpdateReviewStats.mockResolvedValue(undefined);
  mockGetRatingAggregate.mockResolvedValue({ count: 10, avgRating: 4.5 });
  mockGetRatingAggregateByStore.mockResolvedValue({ count: 5, avgRating: 4.2 });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("handleReviewWrite — early exits", () => {
  it("skips if neither before nor after is approved", async () => {
    const ctx = makeCtx();
    await handleReviewWrite({
      reviewId: "r1",
      before: makeReviewData({ status: "pending" }),
      after: makeReviewData({ status: "rejected" }),
    }, ctx);
    expect(mockGetRatingAggregate).not.toHaveBeenCalled();
  });

  it("skips if both before and after are non-approved status", async () => {
    const ctx = makeCtx();
    await handleReviewWrite({
      reviewId: "r1",
      before: makeReviewData({ status: "rejected" }),
      after: makeReviewData({ status: "pending" }),
    }, ctx);
    expect(mockProductUpdate).not.toHaveBeenCalled();
  });

  it("skips if no data (both before and after are null)", async () => {
    const ctx = makeCtx();
    await handleReviewWrite({ reviewId: "r1", before: null, after: null }, ctx);
    expect(mockGetRatingAggregate).not.toHaveBeenCalled();
  });

  it("logs and skips if review has no productId", async () => {
    const ctx = makeCtx();
    await handleReviewWrite({
      reviewId: "r1",
      before: null,
      after: makeReviewData({ status: "approved", productId: undefined }),
    }, ctx);
    expect(ctx.logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/no productId/i),
      null,
      expect.any(Object),
    );
    expect(mockGetRatingAggregate).not.toHaveBeenCalled();
  });
});

describe("handleReviewWrite — review approved (new approval)", () => {
  it("recalculates rating aggregate for the product", async () => {
    const ctx = makeCtx();
    await handleReviewWrite({
      reviewId: "r1",
      before: makeReviewData({ status: "pending" }),
      after: makeReviewData({ status: "approved" }),
    }, ctx);
    expect(mockGetRatingAggregate).toHaveBeenCalledWith("product-charizard");
  });

  it("updates product avgRating and reviewCount", async () => {
    mockGetRatingAggregate.mockResolvedValue({ count: 7, avgRating: 4.2 });
    const ctx = makeCtx();
    await handleReviewWrite({
      reviewId: "r1",
      before: makeReviewData({ status: "pending" }),
      after: makeReviewData({ status: "approved" }),
    }, ctx);
    expect(mockProductUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ avgRating: 4.2, reviewCount: 7 }),
    );
  });

  it("updates store review stats when storeId is present", async () => {
    const ctx = makeCtx();
    await handleReviewWrite({
      reviewId: "r1",
      before: makeReviewData({ status: "pending" }),
      after: makeReviewData({ status: "approved", storeId: "store-A" }),
    }, ctx);
    expect(mockGetRatingAggregateByStore).toHaveBeenCalledWith("store-A");
    expect(mockUpdateReviewStats).toHaveBeenCalledWith("store-A", 5, 4.2);
  });

  it("skips store stats update when storeId is absent", async () => {
    const ctx = makeCtx();
    await handleReviewWrite({
      reviewId: "r1",
      before: makeReviewData({ status: "pending" }),
      after: makeReviewData({ status: "approved", storeId: undefined }),
    }, ctx);
    expect(mockGetRatingAggregateByStore).not.toHaveBeenCalled();
    expect(mockUpdateReviewStats).not.toHaveBeenCalled();
  });
});

describe("handleReviewWrite — review rejected (was approved)", () => {
  it("recalculates rating when a review transitions from approved to rejected", async () => {
    const ctx = makeCtx();
    await handleReviewWrite({
      reviewId: "r1",
      before: makeReviewData({ status: "approved" }),
      after: makeReviewData({ status: "rejected" }),
    }, ctx);
    expect(mockGetRatingAggregate).toHaveBeenCalled();
    expect(mockProductUpdate).toHaveBeenCalled();
  });

  it("uses afterData for productId when available", async () => {
    const ctx = makeCtx();
    await handleReviewWrite({
      reviewId: "r1",
      before: makeReviewData({ status: "approved", productId: "old-product" }),
      after: makeReviewData({ status: "rejected", productId: "product-charizard" }),
    }, ctx);
    expect(mockGetRatingAggregate).toHaveBeenCalledWith("product-charizard");
  });

  it("falls back to beforeData for productId when after is null (delete)", async () => {
    const ctx = makeCtx();
    await handleReviewWrite({
      reviewId: "r1",
      before: makeReviewData({ status: "approved", productId: "product-abc" }),
      after: null,
    }, ctx);
    expect(mockGetRatingAggregate).toHaveBeenCalledWith("product-abc");
  });
});

describe("handleReviewWrite — error propagation", () => {
  it("aggregate calculation failure → re-throws", async () => {
    mockGetRatingAggregate.mockRejectedValue(new Error("Firestore error"));
    const ctx = makeCtx();
    await expect(handleReviewWrite({
      reviewId: "r1",
      before: null,
      after: makeReviewData({ status: "approved" }),
    }, ctx)).rejects.toThrow("Firestore error");
  });

  it("logs error before re-throwing", async () => {
    mockGetRatingAggregate.mockRejectedValue(new Error("Firestore error"));
    const ctx = makeCtx();
    try {
      await handleReviewWrite({
        reviewId: "r1",
        before: null,
        after: makeReviewData({ status: "approved" }),
      }, ctx);
    } catch {
      // expected
    }
    expect(ctx.logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/rating stats/i),
      expect.any(Error),
      expect.any(Object),
    );
  });
});
