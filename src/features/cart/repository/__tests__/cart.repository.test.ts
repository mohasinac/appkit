import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeSnap } from "../../../../../tests/helpers/mock-firestore";

const { db, mockDocRef, mockCollection, mockQuery } = makeMockDb();

vi.mock("../../../../providers/db-firebase/admin", () => ({
  getAdminDb: () => db,
}));

vi.mock("../../../../providers/db-firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../providers/db-firebase")>();
  return {
    ...actual,
    prepareForFirestore: (d: Record<string, unknown>) => d,
  };
});

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

vi.mock("../../../../security", () => ({
  decryptPii: (v: string) => v,
  encryptPii: (v: string) => v,
}));

import { CartRepository } from "../cart.repository";
import { ValidationError, NotFoundError } from "../../../../errors";

const repo = new CartRepository();

type CartItem = {
  itemId: string;
  productId: string;
  productTitle: string;
  productImage: string;
  price: number;
  currency: string;
  quantity: number;
  storeId: string;
  storeName: string;
  listingType: string;
  locked?: boolean;
  offerId?: string;
  lockedPrice?: number;
  bundleCategorySlug?: string;
  bundleProductIds?: string[];
  addedAt: Date;
  updatedAt: Date;
};

type CartDoc = {
  id: string;
  userId: string;
  items: CartItem[];
  appliedCoupons?: Array<{ code: string; scope: string; discountAmount?: number }>;
  selectedItemIds?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
};

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    itemId: "item-1",
    productId: "product-x",
    productTitle: "Test Product",
    productImage: "img.jpg",
    price: 1000,
    currency: "INR",
    quantity: 1,
    storeId: "store-1",
    storeName: "Store",
    listingType: "standard",
    locked: false,
    addedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeCart(overrides: Partial<CartDoc> = {}): CartDoc {
  return {
    id: "user-1",
    userId: "user-1",
    items: [],
    appliedCoupons: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeAddInput(overrides: Partial<CartItem & { isOffer?: boolean }> = {}) {
  return {
    productId: "product-new",
    productTitle: "New Product",
    productImage: "new.jpg",
    price: 500,
    currency: "INR",
    quantity: 1,
    storeId: "store-1",
    storeName: "Store",
    listingType: "standard",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.collection.mockReturnValue(mockCollection);
  mockCollection.doc.mockReturnValue(mockDocRef);
  mockCollection.where.mockReturnValue(mockQuery);
  mockQuery.where.mockReturnValue(mockQuery);
  mockQuery.limit.mockReturnValue(mockQuery);
  mockQuery.get.mockResolvedValue({ docs: [], empty: true });
  mockDocRef.get.mockResolvedValue(makeSnap(null));
  mockDocRef.set.mockResolvedValue(undefined);
  mockDocRef.update.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// getOrCreate
// ---------------------------------------------------------------------------
describe("CartRepository.getOrCreate", () => {
  it("existing cart → returns it without writing", async () => {
    const cart = makeCart({ items: [makeItem()] });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    const result = await repo.getOrCreate("user-1");
    expect(result.id).toBe("user-1");
    expect(mockDocRef.set).not.toHaveBeenCalled();
  });

  it("no cart → creates empty cart and returns it", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const result = await repo.getOrCreate("user-2");
    expect(result.items).toHaveLength(0);
    expect(mockDocRef.set).toHaveBeenCalledOnce();
  });

  it("created cart has userId and id set", async () => {
    mockDocRef.get.mockResolvedValue(makeSnap(null));
    const result = await repo.getOrCreate("user-3");
    expect(result.userId).toBe("user-3");
    expect(result.id).toBe("user-3");
  });
});

// ---------------------------------------------------------------------------
// addItem
// ---------------------------------------------------------------------------
describe("CartRepository.addItem", () => {
  it("new productId → appended to items array", async () => {
    const cart = makeCart({ items: [] });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    const result = await repo.addItem("user-1", makeAddInput({ productId: "product-a" }));
    expect(result.items).toHaveLength(1);
    expect(result.items[0].productId).toBe("product-a");
  });

  it("duplicate productId (no offerId) → quantity merged, no duplicate item", async () => {
    const cart = makeCart({ items: [makeItem({ productId: "product-x", quantity: 2 })] });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    const result = await repo.addItem("user-1", makeAddInput({ productId: "product-x", quantity: 3 }));
    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity).toBe(5);
  });

  it("duplicate productId with offerId → treated as separate item", async () => {
    const cart = makeCart({
      items: [makeItem({ productId: "product-x", offerId: "offer-1" })],
    });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    const result = await repo.addItem("user-1", makeAddInput({ productId: "product-x", offerId: "offer-2" }));
    expect(result.items).toHaveLength(2);
  });

  it("same offerId already in cart → idempotent, cart unchanged", async () => {
    const cart = makeCart({
      items: [makeItem({ productId: "product-x", offerId: "offer-1" })],
    });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    const result = await repo.addItem("user-1", makeAddInput({ productId: "product-x", offerId: "offer-1" }));
    expect(result.items).toHaveLength(1);
    expect(mockDocRef.set).not.toHaveBeenCalled();
  });

  it("stores bundleCategorySlug and bundleProductIds when present", async () => {
    const cart = makeCart({ items: [] });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    const result = await repo.addItem("user-1", makeAddInput({
      bundleCategorySlug: "category-pokemon",
      bundleProductIds: ["product-a", "product-b"],
    }));
    expect(result.items[0].bundleCategorySlug).toBe("category-pokemon");
    expect(result.items[0].bundleProductIds).toEqual(["product-a", "product-b"]);
  });

  it("assigns a random itemId to new items", async () => {
    const cart = makeCart({ items: [] });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    const result = await repo.addItem("user-1", makeAddInput());
    expect(result.items[0].itemId).toBeTruthy();
    expect(typeof result.items[0].itemId).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// removeItem
// ---------------------------------------------------------------------------
describe("CartRepository.removeItem", () => {
  it("unlocked item → removed, remaining items intact", async () => {
    const item1 = makeItem({ itemId: "item-1", productId: "p1" });
    const item2 = makeItem({ itemId: "item-2", productId: "p2" });
    const cart = makeCart({ items: [item1, item2] });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    const result = await repo.removeItem("user-1", "item-1");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].itemId).toBe("item-2");
  });

  it("locked item → throws ValidationError", async () => {
    const lockedItem = makeItem({ itemId: "item-locked", locked: true });
    const cart = makeCart({ items: [lockedItem] });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    await expect(repo.removeItem("user-1", "item-locked")).rejects.toBeInstanceOf(ValidationError);
  });

  it("non-existent itemId → throws NotFoundError", async () => {
    const cart = makeCart({ items: [makeItem()] });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    await expect(repo.removeItem("user-1", "item-nonexistent")).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// updateItem
// ---------------------------------------------------------------------------
describe("CartRepository.updateItem", () => {
  it("unlocked item → quantity updated", async () => {
    const item = makeItem({ itemId: "item-1", quantity: 1 });
    const cart = makeCart({ items: [item] });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    const result = await repo.updateItem("user-1", "item-1", { quantity: 5 });
    expect(result.items[0].quantity).toBe(5);
  });

  it("locked item → throws ValidationError", async () => {
    const item = makeItem({ itemId: "item-1", locked: true });
    const cart = makeCart({ items: [item] });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    await expect(repo.updateItem("user-1", "item-1", { quantity: 5 })).rejects.toBeInstanceOf(ValidationError);
  });

  it("non-existent itemId → throws NotFoundError", async () => {
    const cart = makeCart({ items: [] });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    await expect(repo.updateItem("user-1", "item-x", { quantity: 1 })).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// clearCart
// ---------------------------------------------------------------------------
describe("CartRepository.clearCart", () => {
  it("unlocked items removed, locked items remain", async () => {
    const unlocked = makeItem({ itemId: "item-u", locked: false });
    const locked = makeItem({ itemId: "item-l", locked: true });
    const cart = makeCart({ items: [unlocked, locked] });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    const result = await repo.clearCart("user-1");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].itemId).toBe("item-l");
  });

  it("no locked items → items cleared to empty", async () => {
    const cart = makeCart({ items: [makeItem({ locked: false })] });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    const result = await repo.clearCart("user-1");
    expect(result.items).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getSubtotal
// ---------------------------------------------------------------------------
describe("CartRepository.getSubtotal", () => {
  it("single item: price * quantity", () => {
    const cart = makeCart({ items: [makeItem({ price: 200, quantity: 3 })] });
    expect(repo.getSubtotal(cart as never)).toBe(600);
  });

  it("multiple items: summed correctly", () => {
    const cart = makeCart({
      items: [
        makeItem({ price: 1000, quantity: 1 }),
        makeItem({ itemId: "item-2", productId: "p2", price: 500, quantity: 2 }),
      ],
    });
    expect(repo.getSubtotal(cart as never)).toBe(2000);
  });

  it("empty cart → 0", () => {
    expect(repo.getSubtotal(makeCart() as never)).toBe(0);
  });

  it("uses item.price (not lockedPrice) in the calculation", () => {
    const item = makeItem({ price: 1000, quantity: 1, lockedPrice: 750 });
    const cart = makeCart({ items: [item] });
    // current implementation uses price, not lockedPrice
    expect(repo.getSubtotal(cart as never)).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// getItemCount
// ---------------------------------------------------------------------------
describe("CartRepository.getItemCount", () => {
  it("returns sum of all item quantities (not distinct item count)", () => {
    const cart = makeCart({
      items: [
        makeItem({ quantity: 3 }),
        makeItem({ itemId: "item-2", productId: "p2", quantity: 2 }),
      ],
    });
    // 3 + 2 = 5 total quantity units
    expect(repo.getItemCount(cart as never)).toBe(5);
  });

  it("single item qty 1 → 1", () => {
    const cart = makeCart({ items: [makeItem({ quantity: 1 })] });
    expect(repo.getItemCount(cart as never)).toBe(1);
  });

  it("empty cart → 0", () => {
    expect(repo.getItemCount(makeCart() as never)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// addCoupon / removeCoupon / clearAllCoupons
// ---------------------------------------------------------------------------
describe("CartRepository.addCoupon", () => {
  it("stores coupon in appliedCoupons", async () => {
    const cart = makeCart({ appliedCoupons: [] });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    await repo.addCoupon("user-1", { code: "SAVE10", scope: "admin", discountAmount: 100 } as never);
    expect(mockDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({
        appliedCoupons: expect.arrayContaining([
          expect.objectContaining({ code: "SAVE10" }),
        ]),
      }),
      { merge: true },
    );
  });

  it("same code already applied → replaces it (upsert)", async () => {
    const cart = makeCart({
      appliedCoupons: [{ code: "SAVE10", scope: "admin", discountAmount: 50 }],
    });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    await repo.addCoupon("user-1", { code: "SAVE10", scope: "admin", discountAmount: 100 } as never);
    const setCall = mockDocRef.set.mock.calls[0][0] as { appliedCoupons: Array<{ code: string; discountAmount: number }> };
    const codes = setCall.appliedCoupons.map((c) => c.code);
    expect(codes.filter((c) => c === "SAVE10")).toHaveLength(1);
    expect(setCall.appliedCoupons[0].discountAmount).toBe(100);
  });
});

describe("CartRepository.removeCoupon", () => {
  it("removes coupon matching given code, leaves others", async () => {
    const cart = makeCart({
      appliedCoupons: [
        { code: "SAVE10", scope: "admin" },
        { code: "STORE5", scope: "seller" },
      ],
    });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    await repo.removeCoupon("user-1", "SAVE10");
    const setCall = mockDocRef.set.mock.calls[0][0] as { appliedCoupons: Array<{ code: string }> };
    expect(setCall.appliedCoupons).toHaveLength(1);
    expect(setCall.appliedCoupons[0].code).toBe("STORE5");
  });

  it("code not present → no change, no error", async () => {
    const cart = makeCart({ appliedCoupons: [{ code: "STORE5", scope: "seller" }] });
    mockDocRef.get.mockResolvedValue(makeSnap(cart, "user-1"));
    await repo.removeCoupon("user-1", "NOTHERE");
    const setCall = mockDocRef.set.mock.calls[0][0] as { appliedCoupons: unknown[] };
    expect(setCall.appliedCoupons).toHaveLength(1);
  });
});

describe("CartRepository.clearAllCoupons", () => {
  it("sets appliedCoupons: []", async () => {
    await repo.clearAllCoupons("user-1");
    expect(mockDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ appliedCoupons: [] }),
      { merge: true },
    );
  });
});

// ---------------------------------------------------------------------------
// setSelectedItems
// ---------------------------------------------------------------------------
describe("CartRepository.setSelectedItems", () => {
  it("stores itemIds array in selectedItemIds", async () => {
    await repo.setSelectedItems("user-1", ["item-1", "item-2"]);
    expect(mockDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ selectedItemIds: ["item-1", "item-2"] }),
      { merge: true },
    );
  });

  it("null → clears selectedItemIds (all items selected)", async () => {
    await repo.setSelectedItems("user-1", null);
    expect(mockDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ selectedItemIds: null }),
      { merge: true },
    );
  });
});

// ---------------------------------------------------------------------------
// getStaleRefs
// ---------------------------------------------------------------------------
describe("CartRepository.getStaleRefs", () => {
  it("queries where updatedAt < cutoff date", async () => {
    mockQuery.get.mockResolvedValue({ docs: [] });
    await repo.getStaleRefs(30);
    expect(mockCollection.where).toHaveBeenCalledWith("updatedAt", "<", expect.any(Date));
  });

  it("default ttl is 30 days", async () => {
    const before = new Date();
    before.setDate(before.getDate() - 30);
    mockQuery.get.mockResolvedValue({ docs: [] });
    await repo.getStaleRefs();
    const whereCall = mockCollection.where.mock.calls[0] as [string, string, Date];
    const cutoff = whereCall[2];
    expect(cutoff.getTime()).toBeLessThanOrEqual(new Date().getTime());
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
  });

  it("returns refs for stale carts", async () => {
    const fakeRef = { id: "old-cart" };
    mockQuery.get.mockResolvedValue({ docs: [{ ref: fakeRef }] });
    const refs = await repo.getStaleRefs(30);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toBe(fakeRef);
  });

  it("no stale carts → empty array", async () => {
    mockQuery.get.mockResolvedValue({ docs: [] });
    const refs = await repo.getStaleRefs(30);
    expect(refs).toHaveLength(0);
  });
});
