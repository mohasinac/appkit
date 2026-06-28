import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockTxn } = makeMockDb();

vi.mock("../../../../providers/db-firebase", () => ({
  getAdminDb: () => db,
  BaseRepository: class {
    protected collection: string;
    protected get db() { return db; }
    constructor(col: string) { this.collection = col; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected getCollection() { return (db as any).collection(this.collection); }
  },
}));

vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { SmsCounterRepository } from "../sms-counter.repository";
import { SMS_DAILY_LIMIT } from "../../schemas";

const repo = new SmsCounterRepository();

beforeEach(() => {
  vi.clearAllMocks();
  db.runTransaction.mockImplementation(async (fn: (txn: typeof mockTxn) => Promise<unknown>) => fn(mockTxn));
  mockTxn.set.mockReturnValue(undefined);
});

describe("SmsCounterRepository.checkAndIncrement", () => {
  it("first call of the day → count becomes 1, allowed: true", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(null));
    const result = await repo.checkAndIncrement("2026-01-01");
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1);
  });

  it("count at LIMIT - 1 → increments, allowed: true", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ count: SMS_DAILY_LIMIT - 1, date: "2026-01-01", updatedAt: new Date() }));
    const result = await repo.checkAndIncrement("2026-01-01");
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(SMS_DAILY_LIMIT);
  });

  it("count at LIMIT → not allowed, count unchanged", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ count: SMS_DAILY_LIMIT, date: "2026-01-01", updatedAt: new Date() }));
    const result = await repo.checkAndIncrement("2026-01-01");
    expect(result.allowed).toBe(false);
    expect(result.count).toBe(SMS_DAILY_LIMIT);
    expect(mockTxn.set).not.toHaveBeenCalled();
  });

  it("uses Firestore transaction (runTransaction called)", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(null));
    await repo.checkAndIncrement("2026-01-01");
    expect(db.runTransaction).toHaveBeenCalledOnce();
  });

  it("next UTC day uses different doc ID → starts at 1", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(null));
    const result = await repo.checkAndIncrement("2026-01-02");
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1);
  });
});

describe("SmsCounterRepository.checkAndSetUserCooldown", () => {
  it("first call → allowed: true, sets cooldown doc", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(null));
    const result = await repo.checkAndSetUserCooldown("user-1");
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBe(0);
    expect(mockTxn.set).toHaveBeenCalledOnce();
  });

  it("called within 15 minutes → allowed: false with retryAfterSeconds", async () => {
    const recentlyRequested = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago
    mockTxn.get.mockResolvedValue(makeSnap({
      lastRequestedAt: { toDate: () => recentlyRequested },
    }));
    const result = await repo.checkAndSetUserCooldown("user-1");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(10 * 60); // ~10 min remaining
  });

  it("called after 15 minutes → allowed: true", async () => {
    const old = new Date(Date.now() - 20 * 60 * 1000); // 20 min ago
    mockTxn.get.mockResolvedValue(makeSnap({
      lastRequestedAt: { toDate: () => old },
    }));
    const result = await repo.checkAndSetUserCooldown("user-1");
    expect(result.allowed).toBe(true);
    expect(mockTxn.set).toHaveBeenCalledOnce();
  });

  it("uses Firestore transaction", async () => {
    mockTxn.get.mockResolvedValue(makeSnap(null));
    await repo.checkAndSetUserCooldown("user-1");
    expect(db.runTransaction).toHaveBeenCalledOnce();
  });
});
