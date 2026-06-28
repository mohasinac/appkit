import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetStaleDraftRefs } = vi.hoisted(() => ({
  mockGetStaleDraftRefs: vi.fn(),
}));

vi.mock("../../../../../repositories", () => ({
  productRepository: { getStaleDraftRefs: mockGetStaleDraftRefs },
}));

import { runDraftPrune } from "../draftPrune";
import type { JobContext } from "../../runtime/types";

function makeCtx() {
  const batch = { delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
  return {
    db: { batch: vi.fn(() => batch) } as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetStaleDraftRefs.mockResolvedValue([]);
});

describe("runDraftPrune — no stale drafts", () => {
  it("returns early without calling db.batch", async () => {
    const ctx = makeCtx();
    await runDraftPrune(ctx);
    expect(ctx.db.batch).not.toHaveBeenCalled();
  });

  it("logs that no stale drafts were found", async () => {
    const ctx = makeCtx();
    await runDraftPrune(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringMatching(/no stale/i));
  });
});

describe("runDraftPrune — stale drafts found", () => {
  it("passes a cutoff Date to getStaleDraftRefs", async () => {
    const ctx = makeCtx();
    await runDraftPrune(ctx);
    expect(mockGetStaleDraftRefs).toHaveBeenCalledWith(expect.any(Date));
  });

  it("cutoff is approximately 30 days before now", async () => {
    const ctx = makeCtx();
    await runDraftPrune(ctx);
    const cutoff = mockGetStaleDraftRefs.mock.calls[0][0] as Date;
    const diffMs = Date.now() - cutoff.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThan(31);
  });

  it("commits a batch when stale refs are found", async () => {
    mockGetStaleDraftRefs.mockResolvedValue([{} as FirebaseFirestore.DocumentReference]);
    const batch = { delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    const ctx = {
      db: { batch: vi.fn(() => batch) } as unknown as JobContext["db"],
      now: new Date(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    } as unknown as JobContext;
    await runDraftPrune(ctx);
    expect(batch.commit).toHaveBeenCalled();
  });

  it("logs completion with deleted count", async () => {
    mockGetStaleDraftRefs.mockResolvedValue([{} as FirebaseFirestore.DocumentReference]);
    const ctx = makeCtx();
    await runDraftPrune(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/complete/i),
      expect.objectContaining({ deleted: 1 }),
    );
  });
});
