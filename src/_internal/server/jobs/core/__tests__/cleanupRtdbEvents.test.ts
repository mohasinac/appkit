import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRtdbRef,
  mockRtdbGet,
  mockRtdbRemove,
  mockAuthDeleteUser,
  mockGetAdminRealtimeDb,
  mockGetAdminAuth,
} = vi.hoisted(() => {
  const mockRtdbRemove = vi.fn().mockResolvedValue(undefined);
  const mockRtdbGet = vi.fn();
  const mockAuthDeleteUser = vi.fn().mockResolvedValue(undefined);
  const mockRtdbRef = vi.fn().mockReturnValue({ get: mockRtdbGet, remove: mockRtdbRemove });
  const mockGetAdminRealtimeDb = vi.fn().mockReturnValue({ ref: mockRtdbRef });
  const mockGetAdminAuth = vi.fn().mockReturnValue({ deleteUser: mockAuthDeleteUser });
  return { mockRtdbRef, mockRtdbGet, mockRtdbRemove, mockAuthDeleteUser, mockGetAdminRealtimeDb, mockGetAdminAuth };
});

vi.mock("../../../../../providers/db-firebase", () => ({
  getAdminRealtimeDb: mockGetAdminRealtimeDb,
  getAdminAuth: mockGetAdminAuth,
}));

vi.mock("../../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));

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
