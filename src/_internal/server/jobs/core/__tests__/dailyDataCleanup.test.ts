import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetExpiredSessionRefs,
  mockGetExpiredEmailTokenRefs,
  mockGetExpiredPwRefs,
} = vi.hoisted(() => ({
  mockGetExpiredSessionRefs: vi.fn(),
  mockGetExpiredEmailTokenRefs: vi.fn(),
  mockGetExpiredPwRefs: vi.fn(),
}));

vi.mock("../../../../../repositories", () => ({
  sessionRepository: { getExpiredRefs: mockGetExpiredSessionRefs },
  tokenRepository: {
    getExpiredEmailVerificationRefs: mockGetExpiredEmailTokenRefs,
    getExpiredPasswordResetRefs: mockGetExpiredPwRefs,
  },
}));

import { runDailyDataCleanup } from "../dailyDataCleanup";
import type { JobContext } from "../../runtime/types";

function makeCtx(): JobContext {
  const batch = { delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
  return {
    db: { batch: vi.fn(() => batch) } as unknown as JobContext["db"],
    now: new Date("2026-01-15T12:00:00Z"),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetExpiredSessionRefs.mockResolvedValue([]);
  mockGetExpiredEmailTokenRefs.mockResolvedValue([]);
  mockGetExpiredPwRefs.mockResolvedValue([]);
});

describe("runDailyDataCleanup — repository calls", () => {
  it("calls sessionRepository.getExpiredRefs with ctx.now", async () => {
    const ctx = makeCtx();
    await runDailyDataCleanup(ctx);
    expect(mockGetExpiredSessionRefs).toHaveBeenCalledWith(ctx.now);
  });

  it("calls tokenRepository.getExpiredEmailVerificationRefs with ctx.now", async () => {
    const ctx = makeCtx();
    await runDailyDataCleanup(ctx);
    expect(mockGetExpiredEmailTokenRefs).toHaveBeenCalledWith(ctx.now);
  });

  it("calls tokenRepository.getExpiredPasswordResetRefs with ctx.now", async () => {
    const ctx = makeCtx();
    await runDailyDataCleanup(ctx);
    expect(mockGetExpiredPwRefs).toHaveBeenCalledWith(ctx.now);
  });
});

describe("runDailyDataCleanup — all empty", () => {
  it("completes without committing a batch when all refs are empty", async () => {
    const ctx = makeCtx();
    await runDailyDataCleanup(ctx);
    expect(ctx.db.batch).not.toHaveBeenCalled();
  });
});

describe("runDailyDataCleanup — deletes expired resources", () => {
  it("commits a session-delete batch when expired sessions exist", async () => {
    mockGetExpiredSessionRefs.mockResolvedValue([{} as FirebaseFirestore.DocumentReference]);
    const batch = { delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    const ctx = {
      db: { batch: vi.fn(() => batch) } as unknown as JobContext["db"],
      now: new Date(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    } as unknown as JobContext;
    await runDailyDataCleanup(ctx);
    expect(batch.commit).toHaveBeenCalled();
  });

  it("logs session cleanup results", async () => {
    mockGetExpiredSessionRefs.mockResolvedValue([{} as FirebaseFirestore.DocumentReference]);
    const ctx = makeCtx();
    await runDailyDataCleanup(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/session/i),
      expect.objectContaining({ deleted: 1 }),
    );
  });

  it("logs token cleanup results", async () => {
    mockGetExpiredEmailTokenRefs.mockResolvedValue([{} as FirebaseFirestore.DocumentReference]);
    const ctx = makeCtx();
    await runDailyDataCleanup(ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/token/i),
      expect.objectContaining({ emailVerificationDeleted: 1 }),
    );
  });
});
