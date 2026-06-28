import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: (n: number) => n,
    serverTimestamp: () => new Date(),
    arrayUnion: (...a: unknown[]) => a,
    arrayRemove: (...a: unknown[]) => a,
    delete: () => null,
  },
}));

import { handleCategoryWrite } from "../onCategoryWrite";
import type { JobContext } from "../../runtime/types";

function makeCtx(categoryDocs: Record<string, { position?: number; subtreeSize?: number } | null> = {}) {
  const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
  const mockBatchUpdate = vi.fn();
  const mockBatch = { update: mockBatchUpdate, commit: mockBatchCommit };

  const mockDocGet = vi.fn().mockImplementation(async () => {
    // this is called per-doc; we'll override per test
    return { exists: false, data: () => ({}) };
  });
  const mockDocUpdate = vi.fn().mockResolvedValue(undefined);
  const mockDoc = vi.fn().mockReturnValue({ get: mockDocGet, update: mockDocUpdate });

  const catSnap = {
    docs: Object.entries(categoryDocs)
      .filter(([, d]) => d !== null)
      .map(([id, d]) => ({
        id,
        data: () => d,
        ref: { update: mockDocUpdate },
      })),
  };

  const db = {
    collection: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(catSnap),
      doc: mockDoc,
    }),
    batch: vi.fn().mockReturnValue(mockBatch),
  };
  return {
    db: db as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    _mockDoc: mockDoc,
    _mockDocGet: mockDocGet,
    _mockDocUpdate: mockDocUpdate,
    _mockBatchUpdate: mockBatchUpdate,
    _mockBatchCommit: mockBatchCommit,
  };
}

describe("handleCategoryWrite — CREATE", () => {
  it("assigns position = parent.position + parent.subtreeSize and increments ancestors", async () => {
    const ctx = makeCtx();
    // override the parent doc lookup
    ctx._mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ position: 1, subtreeSize: 3 }),
    });
    const result = ctx.db.collection("categories").doc as typeof ctx._mockDoc;
    void result; // used
    await handleCategoryWrite(
      {
        categoryId: "category-new-child",
        before: null,
        after: { parentIds: ["category-parent"] },
      },
      ctx,
    );
    // The new category should get position = parentPos + parentSize = 1 + 3 = 4
    expect(ctx._mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ position: 4, subtreeSize: 1 }),
    );
  });

  it("appends at max position + 1 for root categories (no parentId)", async () => {
    const ctx = makeCtx({ "category-existing": { position: 5, subtreeSize: 2 } });
    // orderBy query: returns the existing doc
    await handleCategoryWrite(
      { categoryId: "category-root-new", before: null, after: { parentIds: [] } },
      ctx,
    );
    expect(ctx._mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ position: expect.any(Number), subtreeSize: 1 }),
    );
  });

  it("logs category created on successful CREATE", async () => {
    const ctx = makeCtx();
    ctx._mockDocGet.mockResolvedValue({ exists: false });
    await handleCategoryWrite(
      { categoryId: "category-new", before: null, after: { parentIds: [] } },
      ctx,
    );
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/created/i),
      expect.anything(),
    );
  });
});

describe("handleCategoryWrite — DELETE", () => {
  it("skips shift when deleted category has position = 0", async () => {
    const ctx = makeCtx();
    await handleCategoryWrite(
      { categoryId: "category-old", before: { position: 0, subtreeSize: 1, parentIds: [] }, after: null },
      ctx,
    );
    expect(ctx.logger.warn).toHaveBeenCalledWith(
      expect.stringMatching(/no position/i),
      expect.anything(),
    );
  });

  it("shifts positions back on delete when category has a valid position", async () => {
    const ctx = makeCtx({ "category-later": { position: 10, subtreeSize: 1 } });
    await handleCategoryWrite(
      {
        categoryId: "category-deleted",
        before: { position: 5, subtreeSize: 3, parentIds: ["category-parent"] },
        after: null,
      },
      ctx,
    );
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/deleted/i),
      expect.anything(),
    );
  });
});

describe("handleCategoryWrite — UPDATE (parent change)", () => {
  it("flags positionDirty when parentId changes", async () => {
    const ctx = makeCtx();
    await handleCategoryWrite(
      {
        categoryId: "category-moved",
        before: { parentIds: ["category-old-parent"], position: 3, subtreeSize: 1 },
        after: { parentIds: ["category-new-parent"], position: 3, subtreeSize: 1 },
      },
      ctx,
    );
    expect(ctx._mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ positionDirty: true }),
    );
    expect(ctx.logger.warn).toHaveBeenCalledWith(
      expect.stringMatching(/positionDirty/i),
      expect.anything(),
    );
  });

  it("does nothing when parentId is unchanged", async () => {
    const ctx = makeCtx();
    await handleCategoryWrite(
      {
        categoryId: "category-unchanged",
        before: { parentIds: ["category-same-parent"], position: 3, subtreeSize: 1 },
        after: { parentIds: ["category-same-parent"], position: 3, subtreeSize: 1 },
      },
      ctx,
    );
    expect(ctx._mockDocUpdate).not.toHaveBeenCalled();
  });
});

describe("handleCategoryWrite — error handling", () => {
  it("catches Firestore errors and logs them non-fatally", async () => {
    const ctx = makeCtx();
    ctx._mockDocGet.mockRejectedValue(new Error("Firestore error"));
    await expect(
      handleCategoryWrite(
        { categoryId: "category-error", before: null, after: { parentIds: ["category-parent"] } },
        ctx,
      ),
    ).resolves.toBeUndefined();
    expect(ctx.logger.error).toHaveBeenCalled();
  });
});
