import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetPublishedIds,
  mockProductUpdate,
  mockGetApprovedRatingAggregate,
} = vi.hoisted(() => ({
  mockGetPublishedIds: vi.fn(),
  mockProductUpdate: vi.fn(),
  mockGetApprovedRatingAggregate: vi.fn(),
}));

vi.mock("../../../../../repositories", () => ({
  productRepository: {
    getPublishedIds: mockGetPublishedIds,
    update: mockProductUpdate,
  },
  reviewRepository: {
    getApprovedRatingAggregate: mockGetApprovedRatingAggregate,
  },
}));

import { runProductStatsSync } from "../productStatsSync";
import type { JobContext } from "../../runtime/types";

function makeCtx(): JobContext {
  return {
    db: {} as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPublishedIds.mockResolvedValue([]);
  mockGetApprovedRatingAggregate.mockResolvedValue({ count: 0, avgRating: 0 });
  mockProductUpdate.mockResolvedValue(undefined);
});

describe("runProductStatsSync — no published products", () => {
  it("returns early without calling reviewRepository or productRepository.update", async () => {
    const ctx = makeCtx();
    await runProductStatsSync(ctx);
    expect(mockGetApprovedRatingAggregate).not.toHaveBeenCalled();
    expect(mockProductUpdate).not.toHaveBeenCalled();
  });

  it("logs that no published products were found", async () => {
    const ctx = makeCtx();
    await runProductStatsSync(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringMatching(/no published/i));
  });
});

describe("runProductStatsSync — syncs each product", () => {
  it("calls getApprovedRatingAggregate for each published product", async () => {
    mockGetPublishedIds.mockResolvedValue(["product-a", "product-b"]);
    mockGetApprovedRatingAggregate.mockResolvedValue({ count: 5, avgRating: 4.2 });
    const ctx = makeCtx();
    await runProductStatsSync(ctx);
    expect(mockGetApprovedRatingAggregate).toHaveBeenCalledWith("product-a");
    expect(mockGetApprovedRatingAggregate).toHaveBeenCalledWith("product-b");
  });

  it("updates product with avgRating and reviewCount from aggregate", async () => {
    mockGetPublishedIds.mockResolvedValue(["product-a"]);
    mockGetApprovedRatingAggregate.mockResolvedValue({ count: 8, avgRating: 4.5 });
    const ctx = makeCtx();
    await runProductStatsSync(ctx);
    expect(mockProductUpdate).toHaveBeenCalledWith("product-a", { avgRating: 4.5, reviewCount: 8 });
  });

  it("sets avgRating=0 and reviewCount=0 when product has no reviews", async () => {
    mockGetPublishedIds.mockResolvedValue(["product-new"]);
    mockGetApprovedRatingAggregate.mockResolvedValue({ count: 0, avgRating: 0 });
    const ctx = makeCtx();
    await runProductStatsSync(ctx);
    expect(mockProductUpdate).toHaveBeenCalledWith("product-new", { avgRating: 0, reviewCount: 0 });
  });
});

describe("runProductStatsSync — single sync failure does not abort others", () => {
  it("continues syncing remaining products when one sync fails", async () => {
    mockGetPublishedIds.mockResolvedValue(["product-fail", "product-ok"]);
    mockGetApprovedRatingAggregate
      .mockRejectedValueOnce(new Error("Firestore timeout"))
      .mockResolvedValueOnce({ count: 3, avgRating: 4.0 });
    const ctx = makeCtx();
    await runProductStatsSync(ctx);
    // product-ok should still be updated
    expect(mockProductUpdate).toHaveBeenCalledWith("product-ok", { avgRating: 4.0, reviewCount: 3 });
  });

  it("logs error for failed product without re-throwing", async () => {
    mockGetPublishedIds.mockResolvedValue(["product-fail"]);
    mockGetApprovedRatingAggregate.mockRejectedValue(new Error("timeout"));
    const ctx = makeCtx();
    await expect(runProductStatsSync(ctx)).resolves.toBeUndefined();
    expect(ctx.logger.error).toHaveBeenCalled();
  });

  it("logs completion with succeeded and failed counts", async () => {
    mockGetPublishedIds.mockResolvedValue(["product-ok"]);
    mockGetApprovedRatingAggregate.mockResolvedValue({ count: 1, avgRating: 5.0 });
    const ctx = makeCtx();
    await runProductStatsSync(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/complete/i),
      expect.objectContaining({ succeeded: 1, failed: 0 }),
    );
  });
});
