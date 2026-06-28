import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockTxn } = makeMockDb();

vi.mock("../../../../providers/db-firebase", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { UserHistoryRepository } from "../user-history.repository";
import { HISTORY_MAX } from "../../../../constants/limits";

const repo = new UserHistoryRepository();

function makeHistoryItems(count: number, baseDate = new Date("2026-01-01")) {
  return Array.from({ length: count }, (_, i) => ({
    productId: `product-${i}`,
    productType: "product" as const,
    viewedAt: new Date(baseDate.getTime() - i * 1000),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  db.runTransaction.mockImplementation(async (fn: (txn: typeof mockTxn) => Promise<unknown>) => fn(mockTxn));
  mockDocRef.get.mockResolvedValue(makeSnap(null));
  mockTxn.get.mockResolvedValue(makeSnap(null));
  mockTxn.set.mockReturnValue(undefined);
});

describe("UserHistoryRepository.track", () => {
  it("empty history → items has 1 entry, returns 1", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items: [], updatedAt: new Date() }));
    const count = await repo.track("u", { productId: "product-x", productType: "product" });
    expect(count).toBe(1);
    expect(mockTxn.set).toHaveBeenCalledOnce();
  });

  it("49 items + new productId → 50 items, new at position 0", async () => {
    const items = makeHistoryItems(49);
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items, updatedAt: new Date() }));
    const count = await repo.track("u", { productId: "product-new", productType: "product" });
    expect(count).toBe(50);
    const setCall = mockTxn.set.mock.calls[0][1] as { items: Array<{ productId: string }> };
    expect(setCall.items[0].productId).toBe("product-new");
  });

  it("50 items + new productId → evicts last item, stays at 50 (FIFO)", async () => {
    const items = makeHistoryItems(HISTORY_MAX);
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items, updatedAt: new Date() }));
    const count = await repo.track("u", { productId: "product-new", productType: "product" });
    expect(count).toBe(HISTORY_MAX);
    const setCall = mockTxn.set.mock.calls[0][1] as { items: Array<{ productId: string }> };
    expect(setCall.items).toHaveLength(HISTORY_MAX);
    expect(setCall.items[0].productId).toBe("product-new");
    // Last item from original list is evicted
    expect(setCall.items[HISTORY_MAX - 1].productId).not.toBe(`product-${HISTORY_MAX - 1}`);
  });

  it("revisit existing productId → removes old, inserts at position 0, length unchanged", async () => {
    const items = [
      { productId: "product-A", productType: "product", viewedAt: new Date("2026-01-03") },
      { productId: "product-B", productType: "product", viewedAt: new Date("2026-01-02") },
      { productId: "product-C", productType: "product", viewedAt: new Date("2026-01-01") },
    ];
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items, updatedAt: new Date() }));
    const count = await repo.track("u", { productId: "product-C", productType: "product" });
    expect(count).toBe(3);
    const setCall = mockTxn.set.mock.calls[0][1] as { items: Array<{ productId: string }> };
    expect(setCall.items[0].productId).toBe("product-C");
    expect(setCall.items.filter((i) => i.productId === "product-C")).toHaveLength(1);
  });

  it("uses db.runTransaction", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items: [], updatedAt: new Date() }));
    await repo.track("u", { productId: "product-x", productType: "product" });
    expect(db.runTransaction).toHaveBeenCalledOnce();
  });

  it("stores viewedAt as current timestamp when not provided", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items: [], updatedAt: new Date() }));
    const before = Date.now();
    await repo.track("u", { productId: "product-x", productType: "product" });
    const after = Date.now();
    const setCall = mockTxn.set.mock.calls[0][1] as { items: Array<{ viewedAt: Date }> };
    const ts = setCall.items[0].viewedAt.getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe("UserHistoryRepository.merge", () => {
  it("guest items merged into empty history → all items present", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items: [], updatedAt: new Date() }));
    const incoming = [
      { productId: "product-A", productType: "product" as const },
      { productId: "product-B", productType: "product" as const },
    ];
    const count = await repo.merge("u", incoming);
    expect(count).toBe(2);
  });

  it("duplicate productId: keeps newer viewedAt, discards older", async () => {
    const older = new Date("2026-01-01");
    const newer = new Date("2026-01-10");
    const existingItems = [{ productId: "product-A", productType: "product", viewedAt: older }];
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items: existingItems, updatedAt: new Date() }));
    await repo.merge("u", [{ productId: "product-A", productType: "product", viewedAt: newer }]);
    const setCall = mockTxn.set.mock.calls[0][1] as { items: Array<{ productId: string; viewedAt: Date }> };
    expect(setCall.items).toHaveLength(1);
    expect(setCall.items[0].viewedAt.getTime()).toBe(newer.getTime());
  });

  it("result trimmed to HISTORY_MAX (50 items)", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items: [], updatedAt: new Date() }));
    const incoming = Array.from({ length: 60 }, (_, i) => ({
      productId: `product-${i}`,
      productType: "product" as const,
      viewedAt: new Date(Date.now() - i * 1000),
    }));
    const count = await repo.merge("u", incoming);
    expect(count).toBe(HISTORY_MAX);
  });

  it("items sorted descending by viewedAt after merge", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items: [], updatedAt: new Date() }));
    const incoming = [
      { productId: "product-old", productType: "product" as const, viewedAt: new Date("2026-01-01") },
      { productId: "product-new", productType: "product" as const, viewedAt: new Date("2026-01-10") },
    ];
    await repo.merge("u", incoming);
    const setCall = mockTxn.set.mock.calls[0][1] as { items: Array<{ productId: string }> };
    expect(setCall.items[0].productId).toBe("product-new");
    expect(setCall.items[1].productId).toBe("product-old");
  });

  it("uses db.runTransaction", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items: [], updatedAt: new Date() }));
    await repo.merge("u", []);
    expect(db.runTransaction).toHaveBeenCalledOnce();
  });
});

describe("UserHistoryRepository.removeOne", () => {
  it("removes specified productId from items", async () => {
    const items = [
      { productId: "product-A", productType: "product", viewedAt: new Date() },
      { productId: "product-B", productType: "product", viewedAt: new Date() },
    ];
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items, updatedAt: new Date() }));
    await repo.removeOne("u", "product-A");
    const setCall = mockTxn.set.mock.calls[0][1] as { items: Array<{ productId: string }> };
    expect(setCall.items).toHaveLength(1);
    expect(setCall.items[0].productId).toBe("product-B");
  });

  it("non-existent productId → no-op, set not called", async () => {
    const items = [{ productId: "product-A", productType: "product", viewedAt: new Date() }];
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items, updatedAt: new Date() }));
    await repo.removeOne("u", "product-xxx");
    expect(mockTxn.set).not.toHaveBeenCalled();
  });
});

describe("UserHistoryRepository.clearForUser", () => {
  it("sets items: [] without deleting the document", async () => {
    await repo.clearForUser("u");
    expect(mockDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ items: [] }),
    );
  });
});

describe("UserHistoryRepository.getHistory", () => {
  it("returns items array", async () => {
    const items = [{ productId: "product-A", productType: "product", viewedAt: new Date() }];
    mockDocRef.get.mockResolvedValue(makeSnap({ userId: "u", items, updatedAt: new Date() }));
    const result = await repo.getHistory("u");
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe("product-A");
  });

  it("returns empty array for user with no history document", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const result = await repo.getHistory("u");
    expect(result).toEqual([]);
  });
});

describe("UserHistoryRepository.countByUser", () => {
  it("returns items.length", async () => {
    const items = makeHistoryItems(5);
    mockDocRef.get.mockResolvedValue(makeSnap({ userId: "u", items, updatedAt: new Date() }));
    const count = await repo.countByUser("u");
    expect(count).toBe(5);
  });

  it("returns 0 for missing document", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const count = await repo.countByUser("u");
    expect(count).toBe(0);
  });
});
