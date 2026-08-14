import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRtdbRef,
  mockRtdbGet,
  mockRtdbRemove,
  mockAuthDeleteUser,
  mockGetAdminRealtimeDb,
  mockGetAdminAuth,
  mockGetStaleFinishedRefs,
} = vi.hoisted(() => {
  const mockRtdbRemove = vi.fn().mockResolvedValue(undefined);
  const mockRtdbGet = vi.fn();
  const mockAuthDeleteUser = vi.fn().mockResolvedValue(undefined);
  const mockRtdbRef = vi.fn().mockReturnValue({ get: mockRtdbGet, remove: mockRtdbRemove });
  const mockGetAdminRealtimeDb = vi.fn().mockReturnValue({ ref: mockRtdbRef });
  const mockGetAdminAuth = vi.fn().mockReturnValue({ deleteUser: mockAuthDeleteUser });
  const mockGetStaleFinishedRefs = vi.fn().mockResolvedValue([]);
  return {
    mockRtdbRef,
    mockRtdbGet,
    mockRtdbRemove,
    mockAuthDeleteUser,
    mockGetAdminRealtimeDb,
    mockGetAdminAuth,
    mockGetStaleFinishedRefs,
  };
});

vi.mock("../../../../../providers/db-firebase", () => ({
  getAdminRealtimeDb: mockGetAdminRealtimeDb,
  getAdminAuth: mockGetAdminAuth,
}));

vi.mock("../../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));

vi.mock("../../../../../repositories", () => ({
  jobsRepository: { getStaleFinishedRefs: mockGetStaleFinishedRefs },
}));

import { runCleanupRtdbEvents } from "../cleanupRtdbEvents";
import type { JobContext } from "../../runtime/types";

function makeCtx(): JobContext {
  return {
    db: {} as unknown as JobContext["db"],
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as JobContext;
}

const AUTH_STALE_MS = 3 * 60 * 1000;
const PAYMENT_STALE_MS = 15 * 60 * 1000;

function makeAuthSnap(events: Record<string, { createdAt: number }>) {
  return {
    exists: () => Object.keys(events).length > 0,
    val: () => events,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAdminRealtimeDb.mockReturnValue({ ref: mockRtdbRef });
  mockGetAdminAuth.mockReturnValue({ deleteUser: mockAuthDeleteUser });
  mockRtdbRemove.mockResolvedValue(undefined);
  mockAuthDeleteUser.mockResolvedValue(undefined);
  // Default fallback for the 3rd (bulk_events) .get() call — individual
  // tests below still override the first two calls (auth/payment) via
  // mockResolvedValueOnce chains.
  mockRtdbGet.mockResolvedValue({ exists: () => false, val: () => ({}) });
  mockGetStaleFinishedRefs.mockResolvedValue([]);
});

describe("runCleanupRtdbEvents — stale auth events", () => {
  it("removes auth events older than 3 minutes", async () => {
    const staleTime = Date.now() - AUTH_STALE_MS - 1000;
    const snap = makeAuthSnap({ "event-old": { createdAt: staleTime } });
    mockRtdbGet.mockResolvedValueOnce(snap).mockResolvedValueOnce({ exists: () => false, val: () => ({}) });
    const ctx = makeCtx();
    await runCleanupRtdbEvents(ctx);
    expect(mockRtdbRemove).toHaveBeenCalled();
  });

  it("does NOT remove recent auth events (within 3 minutes)", async () => {
    const recentTime = Date.now() - 1000;
    const snap = makeAuthSnap({ "event-new": { createdAt: recentTime } });
    mockRtdbGet.mockResolvedValueOnce(snap).mockResolvedValueOnce({ exists: () => false, val: () => ({}) });
    const ctx = makeCtx();
    await runCleanupRtdbEvents(ctx);
    expect(mockRtdbRemove).not.toHaveBeenCalled();
  });

  it("skips auth cleanup when snapshot does not exist", async () => {
    mockRtdbGet
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce({ exists: () => false });
    const ctx = makeCtx();
    await runCleanupRtdbEvents(ctx);
    expect(mockRtdbRemove).not.toHaveBeenCalled();
  });
});

describe("runCleanupRtdbEvents — stale payment events", () => {
  it("removes payment events older than 15 minutes", async () => {
    const staleTime = Date.now() - PAYMENT_STALE_MS - 1000;
    mockRtdbGet
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce(makeAuthSnap({ "pay-old": { createdAt: staleTime } }));
    const ctx = makeCtx();
    await runCleanupRtdbEvents(ctx);
    expect(mockRtdbRemove).toHaveBeenCalled();
  });

  it("does NOT remove recent payment events (within 15 minutes)", async () => {
    const recentTime = Date.now() - 60 * 1000;
    mockRtdbGet
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce(makeAuthSnap({ "pay-recent": { createdAt: recentTime } }));
    const ctx = makeCtx();
    await runCleanupRtdbEvents(ctx);
    expect(mockRtdbRemove).not.toHaveBeenCalled();
  });
});

const BULK_STALE_MS = 15 * 60 * 1000;

describe("runCleanupRtdbEvents — stale bulk_events", () => {
  it("removes bulk events older than 15 minutes", async () => {
    const staleTime = Date.now() - BULK_STALE_MS - 1000;
    mockRtdbGet
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce(makeAuthSnap({ "job-old": { createdAt: staleTime } }));
    const ctx = makeCtx();
    await runCleanupRtdbEvents(ctx);
    expect(mockRtdbRemove).toHaveBeenCalled();
  });

  it("does NOT remove recent bulk events (within 15 minutes)", async () => {
    const recentTime = Date.now() - 1000;
    mockRtdbGet
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce({ exists: () => false })
      .mockResolvedValueOnce(makeAuthSnap({ "job-recent": { createdAt: recentTime } }));
    const ctx = makeCtx();
    await runCleanupRtdbEvents(ctx);
    expect(mockRtdbRemove).not.toHaveBeenCalled();
  });
});

describe("runCleanupRtdbEvents — stale jobs prune", () => {
  it("deletes finished jobs older than the TTL via jobsRepository.getStaleFinishedRefs", async () => {
    const mockRef = { delete: vi.fn() };
    mockGetStaleFinishedRefs.mockResolvedValue([mockRef]);
    const batchCommit = vi.fn().mockResolvedValue(undefined);
    const batchDelete = vi.fn();
    const ctx = makeCtx();
    (ctx as unknown as { db: { batch: () => unknown } }).db = {
      batch: () => ({ delete: batchDelete, commit: batchCommit }),
    };
    await runCleanupRtdbEvents(ctx);
    expect(mockGetStaleFinishedRefs).toHaveBeenCalledWith(30);
    expect(batchDelete).toHaveBeenCalledWith(mockRef);
    expect(batchCommit).toHaveBeenCalled();
  });

  it("no stale jobs → no batch write", async () => {
    mockGetStaleFinishedRefs.mockResolvedValue([]);
    const ctx = makeCtx();
    await runCleanupRtdbEvents(ctx);
    expect(mockGetStaleFinishedRefs).toHaveBeenCalledWith(30);
  });
});

describe("runCleanupRtdbEvents — auth cleanup failure is non-fatal", () => {
  it("continues to payment cleanup even if auth cleanup throws", async () => {
    mockRtdbGet
      .mockRejectedValueOnce(new Error("RTDB auth_events error"))
      .mockResolvedValueOnce({ exists: () => false });
    const ctx = makeCtx();
    await expect(runCleanupRtdbEvents(ctx)).resolves.toBeUndefined();
    expect(ctx.logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/auth events/i),
      expect.any(Error),
    );
  });
});
