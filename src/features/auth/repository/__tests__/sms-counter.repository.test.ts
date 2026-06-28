import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockTxn } = makeMockDb();

vi.mock("../../../../providers/db-firebase/admin", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../providers/db-firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../providers/db-firebase")>();
  return { ...actual, prepareForFirestore: (d: Record<string, unknown>) => d };
});

vi.mock("../../../../contracts/field-ops", () => ({
  serverTimestamp: () => new Date(),
  increment: (n: number) => n,
  arrayUnion: (...args: unknown[]) => args,
  arrayRemove: (...args: unknown[]) => args,
  deleteField: () => null,
  registerFieldOps: vi.fn(),
}));

vi.mock("../../../../errors/normalize", () => ({ normalizeError: vi.fn() }));
vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { SmsCounterRepository } from "../sms-counter.repository";
import { SMS_DAILY_LIMIT } from "../../schemas";

const repo = new SmsCounterRepository();

beforeEach(() => {
  vi.clearAllMocks();
  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockTxn.get.mockResolvedValue(makeSnap(null));
  mockTxn.set.mockReturnValue(undefined);
  mockTxn.update.mockReturnValue(undefined);
  db.runTransaction.mockImplementation(async (cb: (tx: typeof mockTxn) => Promise<unknown>) => cb(mockTxn));
});

// ---------------------------------------------------------------------------
// checkAndIncrement
// ---------------------------------------------------------------------------
describe("SmsCounterRepository.checkAndIncrement", () => {
  it("first call of the day (no doc) → returns { allowed: true, count: 1 }", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(null));
    const result = await repo.checkAndIncrement("2026-06-27");
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1);
  });

  it("uses Firestore transaction (runTransaction called)", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(null));
    await repo.checkAndIncrement("2026-06-27");
    expect(db.runTransaction).toHaveBeenCalledOnce();
  });

  it("increments existing count by 1", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ count: 4 }));
    const result = await repo.checkAndIncrement("2026-06-27");
    expect(result.count).toBe(5);
    expect(result.allowed).toBe(true);
  });

  it("count at SMS_DAILY_LIMIT - 1 → increments to limit, returns allowed: true", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ count: SMS_DAILY_LIMIT - 1 }));
    const result = await repo.checkAndIncrement("2026-06-27");
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(SMS_DAILY_LIMIT);
  });

  it("count at SMS_DAILY_LIMIT → returns { allowed: false, count: limit }", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ count: SMS_DAILY_LIMIT }));
    const result = await repo.checkAndIncrement("2026-06-27");
    expect(result.allowed).toBe(false);
    expect(result.count).toBe(SMS_DAILY_LIMIT);
  });

  it("count exceeds SMS_DAILY_LIMIT → still returns { allowed: false }", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ count: SMS_DAILY_LIMIT + 5 }));
    const result = await repo.checkAndIncrement("2026-06-27");
    expect(result.allowed).toBe(false);
  });

  it("when allowed, calls tx.set with incremented count", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ count: 2 }));
    await repo.checkAndIncrement("2026-06-27");
    expect(mockTxn.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ count: 3 }),
      { merge: true },
    );
  });

  it("when NOT allowed, does NOT call tx.set", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ count: SMS_DAILY_LIMIT }));
    await repo.checkAndIncrement("2026-06-27");
    expect(mockTxn.set).not.toHaveBeenCalled();
  });

  it("uses dateStr as the document ID (one doc per date)", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(null));
    await repo.checkAndIncrement("2026-06-27");
    expect(mockCollection.doc).toHaveBeenCalledWith("2026-06-27");
  });

  it("stores updatedAt timestamp in the tx.set payload", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(null));
    await repo.checkAndIncrement("2026-06-27");
    const setArg = mockTxn.set.mock.calls[0][1] as Record<string, unknown>;
    expect(setArg).toHaveProperty("updatedAt");
  });
});

// ---------------------------------------------------------------------------
// getCount
// ---------------------------------------------------------------------------
describe("SmsCounterRepository.getCount", () => {
  it("returns 0 when no document exists for the date", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const count = await repo.getCount("2026-06-27");
    expect(count).toBe(0);
  });

  it("returns the stored count", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap({ count: 7 }));
    const count = await repo.getCount("2026-06-27");
    expect(count).toBe(7);
  });

  it("returns 0 if document exists but count field is missing", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap({}));
    const count = await repo.getCount("2026-06-27");
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// checkAndSetUserCooldown
// ---------------------------------------------------------------------------
describe("SmsCounterRepository.checkAndSetUserCooldown", () => {
  it("first call (no existing cooldown doc) → returns { allowed: true }", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(null));
    const result = await repo.checkAndSetUserCooldown("user-ravi");
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it("uses Firestore transaction", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(null));
    await repo.checkAndSetUserCooldown("user-ravi");
    expect(db.runTransaction).toHaveBeenCalledOnce();
  });

  it("cooldown expired (last request >15 min ago) → returns { allowed: true }", async () => {
    const sixteenMinutesAgo = new Date(Date.now() - 16 * 60 * 1000);
    mockTxn.get.mockResolvedValue(
      makeSnap({ lastRequestedAt: { toDate: () => sixteenMinutesAgo } }),
    );
    const result = await repo.checkAndSetUserCooldown("user-ravi");
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it("within 15 min cooldown → returns { allowed: false, retryAfterSeconds > 0 }", async () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    mockTxn.get.mockResolvedValue(
      makeSnap({ lastRequestedAt: { toDate: () => twoMinutesAgo } }),
    );
    const result = await repo.checkAndSetUserCooldown("user-ravi");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    // 15 min - 2 min = 13 min = 780s (±1s tolerance)
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(778);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(780);
  });

  it("just within cooldown (1 second in) → retryAfterSeconds ≈ 899", async () => {
    const oneSecondAgo = new Date(Date.now() - 1000);
    mockTxn.get.mockResolvedValue(
      makeSnap({ lastRequestedAt: { toDate: () => oneSecondAgo } }),
    );
    const result = await repo.checkAndSetUserCooldown("user-ravi");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(898);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(900);
  });

  it("document ID is user_cooldown_{userId}", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(null));
    await repo.checkAndSetUserCooldown("user-ravi");
    expect(mockCollection.doc).toHaveBeenCalledWith("user_cooldown_user-ravi");
  });

  it("when allowed, calls tx.set with lastRequestedAt timestamp", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(null));
    await repo.checkAndSetUserCooldown("user-ravi");
    expect(mockTxn.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lastRequestedAt: expect.any(Date) }),
      { merge: true },
    );
  });

  it("when NOT allowed, does NOT call tx.set", async () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    mockTxn.get.mockResolvedValue(
      makeSnap({ lastRequestedAt: { toDate: () => twoMinutesAgo } }),
    );
    await repo.checkAndSetUserCooldown("user-ravi");
    expect(mockTxn.set).not.toHaveBeenCalled();
  });
});
