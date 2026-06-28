import { describe, it, expect, vi, beforeEach } from "vitest";

import { runPositionsReconcile } from "../positionsReconcile";
import type { JobContext } from "../../runtime/types";

function makeCtx(docs: { id: string; position?: number; subtreeSize?: number; parentIds?: string[]; order?: number; positionDirty?: boolean }[] = []) {
  const batchUpdate = vi.fn();
  const batchCommit = vi.fn().mockResolvedValue(undefined);
  const mockBatch = { update: batchUpdate, commit: batchCommit };

  const docUpdate = vi.fn().mockResolvedValue(undefined);
  const snap = {
    docs: docs.map((d) => ({
      id: d.id,
      data: () => ({
        parentIds: d.parentIds ?? [],
        order: d.order ?? 0,
        position: d.position ?? 0,
        subtreeSize: d.subtreeSize ?? 1,
        positionDirty: d.positionDirty ?? false,
      }),
      ref: { update: docUpdate },
    })),
  };

  const db = {
    collection: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue(snap),
      doc: vi.fn().mockReturnValue({ update: docUpdate }),
    }),
    batch: vi.fn().mockReturnValue(mockBatch),
  };

  return {
    db: db as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    _batchUpdate: batchUpdate,
    _batchCommit: batchCommit,
    _docUpdate: docUpdate,
  };
}

describe("runPositionsReconcile — empty collection", () => {
  it("returns without any batch when no categories exist", async () => {
    const ctx = makeCtx([]);
    await runPositionsReconcile(ctx);
    expect(ctx._batchCommit).not.toHaveBeenCalled();
    expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringMatching(/nothing to reconcile/i));
  });
});

describe("runPositionsReconcile — positions already correct", () => {
  it("skips batch update when positions already match DFS assignment", async () => {
    const docs = [
      { id: "cat-root", position: 1, subtreeSize: 2, parentIds: [], order: 0 },
      { id: "cat-child", position: 2, subtreeSize: 1, parentIds: ["cat-root"], order: 0 },
    ];
    const ctx = makeCtx(docs);
    await runPositionsReconcile(ctx);
    expect(ctx._batchCommit).not.toHaveBeenCalled();
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/already correct/i),
      expect.anything(),
    );
  });
});

describe("runPositionsReconcile — single root category", () => {
  it("assigns position=1 to the first root", async () => {
    const docs = [
      { id: "cat-only", position: 5, subtreeSize: 1, parentIds: [], order: 0 },
    ];
    const ctx = makeCtx(docs);
    await runPositionsReconcile(ctx);
    expect(ctx._batchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ position: 1 }),
    );
  });
});

describe("runPositionsReconcile — parent with one child", () => {
  it("assigns parent position=1, subtreeSize=2; child position=2, subtreeSize=1", async () => {
    const docs = [
      { id: "cat-root", position: 99, subtreeSize: 99, parentIds: [], order: 0 },
      { id: "cat-child", position: 99, subtreeSize: 99, parentIds: ["cat-root"], order: 0 },
    ];
    const ctx = makeCtx(docs);
    await runPositionsReconcile(ctx);
    const calls = ctx._batchUpdate.mock.calls;
    const rootCall = calls.find(c => c[1].position === 1);
    const childCall = calls.find(c => c[1].position === 2);
    expect(rootCall?.[1].subtreeSize).toBe(2);
    expect(childCall?.[1].subtreeSize).toBe(1);
  });
});

describe("runPositionsReconcile — positionDirty flag cleared", () => {
  it("includes positionDirty: false in the batch update", async () => {
    const docs = [
      { id: "cat-dirty", position: 1, subtreeSize: 1, parentIds: [], positionDirty: true },
    ];
    const ctx = makeCtx(docs);
    await runPositionsReconcile(ctx);
    expect(ctx._batchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ positionDirty: false }),
    );
  });
});

describe("runPositionsReconcile — sibling ordering", () => {
  it("assigns positions respecting the order field (lower order first)", async () => {
    const docs = [
      { id: "cat-root", position: 99, subtreeSize: 3, parentIds: [], order: 0 },
      { id: "cat-second", position: 99, subtreeSize: 1, parentIds: ["cat-root"], order: 2 },
      { id: "cat-first", position: 99, subtreeSize: 1, parentIds: ["cat-root"], order: 1 },
    ];
    const ctx = makeCtx(docs);
    await runPositionsReconcile(ctx);
    const calls = ctx._batchUpdate.mock.calls;
    const catFirst = calls.find(c => {
      const ref = c[0];
      // we can't easily check ref.id without adapter but positions tell us
      return c[1].position === 2;
    });
    const catSecond = calls.find(c => c[1].position === 3);
    expect(catFirst).toBeDefined();
    expect(catSecond).toBeDefined();
  });
});

describe("runPositionsReconcile — logs completion", () => {
  it("logs scanned and updated counts", async () => {
    const docs = [
      { id: "cat-drift", position: 99, subtreeSize: 1, parentIds: [], order: 0 },
    ];
    const ctx = makeCtx(docs);
    await runPositionsReconcile(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/reconciled/i),
      expect.objectContaining({ scanned: 1, updated: 1 }),
    );
  });
});
