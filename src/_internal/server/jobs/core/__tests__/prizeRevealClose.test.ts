import { describe, it, expect, vi } from "vitest";

import { runPrizeRevealClose } from "../prizeRevealClose";
import type { JobContext } from "../../runtime/types";

function makeCtx(docs: { id: string }[] = []) {
  const batchUpdate = vi.fn();
  const batchCommit = vi.fn().mockResolvedValue(undefined);
  const mockBatch = { update: batchUpdate, commit: batchCommit };

  const snap = {
    empty: docs.length === 0,
    size: docs.length,
    docs: docs.map((d) => ({ id: d.id, ref: { id: d.id } })),
  };

  const db = {
    collection: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(snap),
    }),
    batch: vi.fn().mockReturnValue(mockBatch),
  };

  return {
    db: db as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    _batchUpdate: batchUpdate,
    _batchCommit: batchCommit,
  };
}

describe("runPrizeRevealClose — no draws to close", () => {
  it("returns early without calling batch when snapshot is empty", async () => {
    const ctx = makeCtx([]);
    await runPrizeRevealClose(ctx);
    expect(ctx._batchCommit).not.toHaveBeenCalled();
    expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringMatching(/no prize draws to close/i));
  });
});

describe("runPrizeRevealClose — closes open draws past window end", () => {
  it("batch-updates each doc to prizeRevealStatus = closed", async () => {
    const ctx = makeCtx([{ id: "auction-pd-1" }, { id: "auction-pd-2" }]);
    await runPrizeRevealClose(ctx);
    expect(ctx._batchUpdate).toHaveBeenCalledTimes(2);
    expect(ctx._batchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ prizeRevealStatus: "closed" }),
    );
  });

  it("calls batch.commit exactly once", async () => {
    const ctx = makeCtx([{ id: "auction-pd-1" }]);
    await runPrizeRevealClose(ctx);
    expect(ctx._batchCommit).toHaveBeenCalledTimes(1);
  });

  it("logs the count of closed draws", async () => {
    const ctx = makeCtx([{ id: "auction-pd-1" }, { id: "auction-pd-2" }]);
    await runPrizeRevealClose(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/closed prize draws/i),
      expect.objectContaining({ count: 2 }),
    );
  });
});
