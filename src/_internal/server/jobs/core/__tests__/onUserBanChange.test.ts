import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

import { handleUserBanChange } from "../onUserBanChange";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeBatch() {
  return {
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };
}

function makeCtx(batch = makeBatch()) {
  const mockDoc = vi.fn().mockReturnValue({});
  const banHistoryCollection = { doc: mockDoc };
  const userDoc = { collection: vi.fn().mockReturnValue(banHistoryCollection) };
  const usersCollection = { doc: vi.fn().mockReturnValue(userDoc) };
  return {
    db: {
      collection: vi.fn().mockReturnValue(usersCollection),
      batch: vi.fn().mockReturnValue(batch),
    },
    batch,
    now: new Date(),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("handleUserBanChange — early exit", () => {
  it("returns immediately when after is null", async () => {
    const ctx = makeCtx();
    await handleUserBanChange({ uid: "user-1", before: null, after: null }, ctx);
    expect(ctx.batch.commit).not.toHaveBeenCalled();
  });

  it("returns without writing when no ban changes detected", async () => {
    // before = active, after = active (same state, no ban)
    const ctx = makeCtx();
    await handleUserBanChange({
      uid: "user-1",
      before: { isDisabled: false, softBans: [] },
      after: { isDisabled: false, softBans: [] },
    }, ctx);
    expect(ctx.batch.commit).not.toHaveBeenCalled();
  });
});

describe("handleUserBanChange — hard ban applied", () => {
  it("writes a hard_ban entry when isDisabled transitions false→true", async () => {
    const batch = makeBatch();
    const ctx = makeCtx(batch);
    await handleUserBanChange({
      uid: "user-1",
      before: { isDisabled: false },
      after: { isDisabled: true, hardBanReason: "Violating ToS", hardBannedBy: "admin-1" },
    }, ctx);
    expect(batch.set).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ type: "hard_ban", reason: "Violating ToS" }),
    );
    expect(batch.commit).toHaveBeenCalled();
  });

  it("stores hardBannedBy as performedBy in the history entry", async () => {
    const batch = makeBatch();
    const ctx = makeCtx(batch);
    await handleUserBanChange({
      uid: "user-1",
      before: { isDisabled: false },
      after: { isDisabled: true, hardBanReason: "Fraud", hardBannedBy: "admin-2" },
    }, ctx);
    const call = batch.set.mock.calls[0][1] as { performedBy: string };
    expect(call.performedBy).toBe("admin-2");
  });

  it("does NOT write hard_ban when isDisabled stays true (no transition)", async () => {
    const batch = makeBatch();
    const ctx = makeCtx(batch);
    await handleUserBanChange({
      uid: "user-1",
      before: { isDisabled: true },
      after: { isDisabled: true, hardBanReason: "Fraud" },
    }, ctx);
    const hardBanCalls = (batch.set.mock.calls as Array<[unknown, { type: string }]>).filter(
      (c) => c[1].type === "hard_ban",
    );
    expect(hardBanCalls).toHaveLength(0);
  });
});

describe("handleUserBanChange — hard ban lifted (unban)", () => {
  it("writes a hard_unban entry when isDisabled transitions true→false", async () => {
    const batch = makeBatch();
    const ctx = makeCtx(batch);
    await handleUserBanChange({
      uid: "user-1",
      before: { isDisabled: true },
      after: { isDisabled: false },
    }, ctx);
    expect(batch.set).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ type: "hard_unban" }),
    );
  });
});

describe("handleUserBanChange — soft ban changes", () => {
  it("writes a soft_ban entry for each newly added soft ban action", async () => {
    const batch = makeBatch();
    const ctx = makeCtx(batch);
    await handleUserBanChange({
      uid: "user-1",
      before: { softBans: [] },
      after: {
        softBans: [
          { action: "place_bids", reason: "Shill bidding", bannedBy: "admin-1" },
        ],
      },
    }, ctx);
    expect(batch.set).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ type: "soft_ban", action: "place_bids" }),
    );
  });

  it("writes soft_unban for each removed soft ban", async () => {
    const batch = makeBatch();
    const ctx = makeCtx(batch);
    await handleUserBanChange({
      uid: "user-1",
      before: { softBans: [{ action: "place_bids" }] },
      after: { softBans: [] },
    }, ctx);
    expect(batch.set).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ type: "soft_unban", action: "place_bids" }),
    );
  });

  it("does NOT write entry for soft bans that are unchanged", async () => {
    const batch = makeBatch();
    const ctx = makeCtx(batch);
    await handleUserBanChange({
      uid: "user-1",
      before: { softBans: [{ action: "place_bids" }] },
      after: { softBans: [{ action: "place_bids" }] }, // same ban, no change
    }, ctx);
    expect(batch.commit).not.toHaveBeenCalled();
  });

  it("handles multiple simultaneous soft ban additions", async () => {
    const batch = makeBatch();
    const ctx = makeCtx(batch);
    await handleUserBanChange({
      uid: "user-1",
      before: { softBans: [] },
      after: {
        softBans: [
          { action: "place_bids" },
          { action: "post_reviews" },
        ],
      },
    }, ctx);
    expect(batch.set).toHaveBeenCalledTimes(2);
  });
});

describe("handleUserBanChange — batch failure", () => {
  it("batch.commit failure is non-fatal — logs error but does not throw", async () => {
    const batch = makeBatch();
    batch.commit.mockRejectedValue(new Error("Firestore error"));
    const ctx = makeCtx(batch);
    await expect(handleUserBanChange({
      uid: "user-1",
      before: { isDisabled: false },
      after: { isDisabled: true, hardBanReason: "Test" },
    }, ctx)).resolves.toBeUndefined();
    expect(ctx.logger.error).toHaveBeenCalled();
  });
});
