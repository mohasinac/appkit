import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetOldReadRefs } = vi.hoisted(() => ({
  mockGetOldReadRefs: vi.fn(),
}));

vi.mock("../../../../../repositories", () => ({
  notificationRepository: { getOldReadRefs: mockGetOldReadRefs },
}));

import { runNotificationPrune } from "../notificationPrune";
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
  mockGetOldReadRefs.mockResolvedValue([]);
});

describe("runNotificationPrune — no old notifications", () => {
  it("returns early without calling db.batch", async () => {
    const ctx = makeCtx();
    await runNotificationPrune(ctx);
    expect(ctx.db.batch).not.toHaveBeenCalled();
  });

  it("logs that no stale read notifications were found", async () => {
    const ctx = makeCtx();
    await runNotificationPrune(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(expect.stringMatching(/no stale/i));
  });
});

describe("runNotificationPrune — old notifications found", () => {
  it("calls getOldReadRefs with a positive TTL days argument", async () => {
    const ctx = makeCtx();
    await runNotificationPrune(ctx);
    expect(mockGetOldReadRefs).toHaveBeenCalledWith(expect.any(Number));
    expect(mockGetOldReadRefs.mock.calls[0][0]).toBeGreaterThan(0);
  });

  it("commits a batch when refs are found", async () => {
    mockGetOldReadRefs.mockResolvedValue([{} as FirebaseFirestore.DocumentReference]);
    const batch = { delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    const ctx = {
      db: { batch: vi.fn(() => batch) } as unknown as JobContext["db"],
      now: new Date(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    } as unknown as JobContext;
    await runNotificationPrune(ctx);
    expect(batch.commit).toHaveBeenCalled();
  });

  it("logs completion with deleted count", async () => {
    mockGetOldReadRefs.mockResolvedValue([{} as FirebaseFirestore.DocumentReference]);
    const ctx = makeCtx();
    await runNotificationPrune(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/complete/i),
      expect.objectContaining({ deleted: 1 }),
    );
  });
});
