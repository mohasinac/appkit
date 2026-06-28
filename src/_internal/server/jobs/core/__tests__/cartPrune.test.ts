import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetStaleRefs } = vi.hoisted(() => ({
  mockGetStaleRefs: vi.fn(),
}));

vi.mock("../../../../../repositories", () => ({
  cartRepository: { getStaleRefs: mockGetStaleRefs },
}));

import { runCartPrune } from "../cartPrune";
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
  mockGetStaleRefs.mockResolvedValue([]);
});

describe("runCartPrune — no stale carts", () => {
  it("returns early without calling db.batch when no stale carts", async () => {
    const ctx = makeCtx();
    await runCartPrune(ctx);
    expect(ctx.db.batch).not.toHaveBeenCalled();
  });

  it("logs info about no stale carts", async () => {
    const ctx = makeCtx();
    await runCartPrune(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringMatching(/no stale/i));
  });
});

describe("runCartPrune — stale carts found", () => {
  it("calls db.batch to delete stale cart refs", async () => {
    const ref1 = {} as FirebaseFirestore.DocumentReference;
    const ref2 = {} as FirebaseFirestore.DocumentReference;
    mockGetStaleRefs.mockResolvedValue([ref1, ref2]);
    const ctx = makeCtx();
    await runCartPrune(ctx);
    expect(ctx.db.batch).toHaveBeenCalled();
  });

  it("commits the batch", async () => {
    mockGetStaleRefs.mockResolvedValue([{} as FirebaseFirestore.DocumentReference]);
    const batch = { delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    const ctx = {
      db: { batch: vi.fn(() => batch) } as unknown as JobContext["db"],
      now: new Date(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    } as unknown as JobContext;
    await runCartPrune(ctx);
    expect(batch.commit).toHaveBeenCalled();
  });

  it("logs completion with deleted count", async () => {
    mockGetStaleRefs.mockResolvedValue([{} as FirebaseFirestore.DocumentReference]);
    const ctx = makeCtx();
    await runCartPrune(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/complete/i),
      expect.objectContaining({ deleted: 1 }),
    );
  });
});

describe("runCartPrune — passes correct TTL to repository", () => {
  it("passes TTL_DAYS to getStaleRefs", async () => {
    const ctx = makeCtx();
    await runCartPrune(ctx);
    expect(mockGetStaleRefs).toHaveBeenCalledWith(expect.any(Number));
    const ttl = mockGetStaleRefs.mock.calls[0][0];
    expect(ttl).toBeGreaterThan(0);
  });
});
