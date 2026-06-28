import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockTxn } = makeMockDb();

vi.mock("../../../../providers/db-firebase", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../monitoring", () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { UserWishlistRepository, WishlistFullError } from "../user-wishlist.repository";
import { WISHLIST_MAX } from "../../../../constants/limits";

const repo = new UserWishlistRepository();

function makeItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    productId: `product-${i}`,
    addedAt: new Date(),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset collection chain so tests that override db.collection don't leak
  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  // Default: runTransaction calls through
  db.runTransaction.mockImplementation(async (fn: (txn: typeof mockTxn) => Promise<unknown>) => fn(mockTxn));
  // Default: doc.get returns non-existent snap
  mockDocRef.get.mockResolvedValue(makeSnap(null));
  mockDocRef.set.mockResolvedValue(undefined);
  mockTxn.get.mockResolvedValue(makeSnap(null));
  mockTxn.set.mockResolvedValue(undefined);
});

describe("UserWishlistRepository.addItem", () => {
  it("adds first item: count = 1, no error", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "user-1", items: [], updatedAt: new Date() }));
    const count = await repo.addItem("user-1", "product-new");
    expect(count).toBe(1);
    expect(mockTxn.set).toHaveBeenCalledOnce();
  });

  it("19 items → adds item, count = 20, no error", async () => {
    const items = makeItems(19);
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items, updatedAt: new Date() }));
    const count = await repo.addItem("u", "product-20");
    expect(count).toBe(20);
  });

  it("20 items + new productId → throws WishlistFullError with current=20, limit=20", async () => {
    const items = makeItems(WISHLIST_MAX);
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items, updatedAt: new Date() }));
    await expect(repo.addItem("u", "product-new")).rejects.toBeInstanceOf(WishlistFullError);
    const err = await repo.addItem("u", "product-new").catch((e: WishlistFullError) => e);
    if (err instanceof WishlistFullError) {
      expect(err.current).toBe(WISHLIST_MAX);
      expect(err.limit).toBe(WISHLIST_MAX);
    }
  });

  it("20 items + same productId (existing) → idempotent no-op, returns existing count", async () => {
    const items = makeItems(WISHLIST_MAX);
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items, updatedAt: new Date() }));
    const count = await repo.addItem("u", "product-0"); // already in list
    expect(count).toBe(WISHLIST_MAX);
    expect(mockTxn.set).not.toHaveBeenCalled();
  });

  it("5 items + existing productId → idempotent no-op, count remains 5", async () => {
    const items = makeItems(5);
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items, updatedAt: new Date() }));
    const count = await repo.addItem("u", "product-3"); // already in list
    expect(count).toBe(5);
    expect(mockTxn.set).not.toHaveBeenCalled();
  });

  it("uses db.runTransaction for every add", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items: [], updatedAt: new Date() }));
    await repo.addItem("u", "product-x");
    expect(db.runTransaction).toHaveBeenCalledOnce();
  });

  it("stores productType in the item", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items: [], updatedAt: new Date() }));
    await repo.addItem("u", "product-x", { productType: "auction" });
    const setCall = mockTxn.set.mock.calls[0][1] as { items: Array<{ productType: string }> };
    expect(setCall.items[0].productType).toBe("auction");
  });
});

describe("UserWishlistRepository.removeItem", () => {
  it("removes existing productId, count decrements", async () => {
    const items = [
      { productId: "product-0", addedAt: new Date() },
      { productId: "product-1", addedAt: new Date() },
    ];
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items, updatedAt: new Date() }));
    await repo.removeItem("u", "product-0");
    const setCall = mockTxn.set.mock.calls[0][1] as { items: Array<{ productId: string }> };
    expect(setCall.items).toHaveLength(1);
    expect(setCall.items[0].productId).toBe("product-1");
  });

  it("non-existent productId → no-op, set not called", async () => {
    const items = [{ productId: "product-0", addedAt: new Date() }];
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items, updatedAt: new Date() }));
    await repo.removeItem("u", "product-xxx");
    expect(mockTxn.set).not.toHaveBeenCalled();
  });

  it("uses db.runTransaction", async () => {
    mockTxn.get.mockResolvedValue(makeSnap({ userId: "u", items: [], updatedAt: new Date() }));
    await repo.removeItem("u", "product-x");
    expect(db.runTransaction).toHaveBeenCalledOnce();
  });
});

describe("UserWishlistRepository.isInWishlist", () => {
  it("productId in items array → returns true", async () => {
    const items = [{ productId: "product-0", addedAt: new Date() }];
    // First get: wishlist doc; second get: product exists check in filterExistingProducts
    mockDocRef.get
      .mockResolvedValueOnce(makeSnap({ userId: "u", items, updatedAt: new Date() }))
      .mockResolvedValue(makeSnap({ id: "product-0" }, "product-0"));
    const result = await repo.isInWishlist("u", "product-0");
    expect(result).toBe(true);
  });

  it("productId not in items array → returns false", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap({ userId: "u", items: [], updatedAt: new Date() }));
    const result = await repo.isInWishlist("u", "product-xxx");
    expect(result).toBe(false);
  });
});

describe("UserWishlistRepository.countByUser", () => {
  it("returns items.length from stored document", async () => {
    const items = makeItems(7);
    mockDocRef.get.mockResolvedValue(makeSnap({ userId: "u", items, updatedAt: new Date() }));
    const count = await repo.countByUser("u");
    expect(count).toBe(7);
  });

  it("returns 0 for user with no document", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const count = await repo.countByUser("u");
    expect(count).toBe(0);
  });
});

describe("UserWishlistRepository.clearWishlist", () => {
  it("sets items: [] without deleting the document", async () => {
    await repo.clearWishlist("u");
    expect(mockDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ items: [] }),
    );
  });
});
