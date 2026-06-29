import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequireRoleUser,
  mockWishlistAddItem,
  mockWishlistRemoveItem,
  mockWishlistFullError,
} = vi.hoisted(() => ({
  mockRequireRoleUser: vi.fn(),
  mockWishlistAddItem: vi.fn(),
  mockWishlistRemoveItem: vi.fn(),
  mockWishlistFullError: class WishlistFullError extends Error {
    current: number;
    constructor(current: number) {
      super("Wishlist is full");
      this.name = "WishlistFullError";
      this.current = current;
    }
  },
}));

vi.mock("@mohasinac/appkit/server", () => ({
  wrapAction: async (fn: () => Promise<unknown>) => {
    try {
      return { ok: true, data: await fn() };
    } catch (e: unknown) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
}));

vi.mock("../../../../repositories", () => ({
  wishlistRepository: {
    addItem: mockWishlistAddItem,
    removeItem: mockWishlistRemoveItem,
  },
  WishlistFullError: mockWishlistFullError,
}));

vi.mock("../../../../providers/auth-firebase/helpers", () => ({
  requireRoleUser: mockRequireRoleUser,
}));

vi.mock("../../../../errors/normalize", () => ({
  normalizeError: vi.fn(),
}));

import {
  addToWishlistAction,
  removeFromWishlistAction,
  mergeGuestWishlistAction,
} from "../actions";

function makeUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-buyer-1", email: "buyer@test.com", name: "Buyer One", ...overrides };
}

describe("addToWishlistAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockWishlistAddItem.mockResolvedValue({ count: 3 });
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await addToWishlistAction("product-charizard-psa9");
    expect(result.ok).toBe(false);
  });

  it("valid → wishlistRepository.addItem called with userId and productId", async () => {
    await addToWishlistAction("product-charizard-psa9");
    expect(mockWishlistAddItem).toHaveBeenCalledWith("user-buyer-1", "product-charizard-psa9", undefined);
  });

  it("valid with extras → extras passed to addItem", async () => {
    const extras = { productType: "standard" as const, priceAtAdd: 500000 };
    await addToWishlistAction("product-charizard-psa9", extras);
    expect(mockWishlistAddItem).toHaveBeenCalledWith("user-buyer-1", "product-charizard-psa9", extras);
  });

  it("WishlistFullError → { ok: false } via WishlistCapError rethrow", async () => {
    const WFE = mockWishlistFullError;
    mockWishlistAddItem.mockRejectedValue(new WFE(20));
    const result = await addToWishlistAction("product-charizard-psa9");
    expect(result.ok).toBe(false);
  });

  it("success → { ok: true, data: from addItem }", async () => {
    const data = { count: 5 };
    mockWishlistAddItem.mockResolvedValue(data);
    const result = await addToWishlistAction("product-charizard-psa9");
    expect(result.ok).toBe(true);
    expect((result as { data: unknown }).data).toEqual(data);
  });
});

describe("removeFromWishlistAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockWishlistRemoveItem.mockResolvedValue(undefined);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await removeFromWishlistAction("product-charizard-psa9");
    expect(result.ok).toBe(false);
  });

  it("valid → wishlistRepository.removeItem called with userId and productId", async () => {
    await removeFromWishlistAction("product-charizard-psa9");
    expect(mockWishlistRemoveItem).toHaveBeenCalledWith("user-buyer-1", "product-charizard-psa9");
  });

  it("non-existent productId → { ok: true } (no-op, not an error)", async () => {
    mockWishlistRemoveItem.mockResolvedValue(undefined);
    const result = await removeFromWishlistAction("product-nonexistent");
    expect(result.ok).toBe(true);
  });

  it("success → { ok: true }", async () => {
    const result = await removeFromWishlistAction("product-charizard-psa9");
    expect(result.ok).toBe(true);
  });
});

describe("mergeGuestWishlistAction", () => {
  const guestItems = [
    { productId: "product-charizard-psa9", productType: "standard" as const, priceAtAdd: 500000 },
    { productId: "product-pikachu-base", productType: "standard" as const },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockWishlistAddItem.mockResolvedValue({ count: 3 });
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await mergeGuestWishlistAction(guestItems);
    expect(result.ok).toBe(false);
  });

  it("empty guestItems → { ok: true } immediately (no addItem calls)", async () => {
    const result = await mergeGuestWishlistAction([]);
    expect(result.ok).toBe(true);
    expect(mockWishlistAddItem).not.toHaveBeenCalled();
  });

  it("valid items → addItem called for each item", async () => {
    await mergeGuestWishlistAction(guestItems);
    expect(mockWishlistAddItem).toHaveBeenCalledTimes(2);
  });

  it("WishlistFullError on one item → stops processing remaining items", async () => {
    const WFE = mockWishlistFullError;
    mockWishlistAddItem.mockResolvedValueOnce({ count: 5 });
    mockWishlistAddItem.mockRejectedValueOnce(new WFE(20));
    await mergeGuestWishlistAction([
      { productId: "product-charizard-psa9", productType: "standard" as const },
      { productId: "product-pikachu-base", productType: "standard" as const },
      { productId: "product-mewtwo", productType: "standard" as const },
    ]);
    expect(mockWishlistAddItem).toHaveBeenCalledTimes(2);
  });

  it("success → returns merged product IDs", async () => {
    const result = await mergeGuestWishlistAction(guestItems);
    expect(result.ok).toBe(true);
    expect((result as { data: string[] }).data).toHaveLength(2);
  });
});
