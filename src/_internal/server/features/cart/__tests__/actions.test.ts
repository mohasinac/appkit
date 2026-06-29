import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequireRoleUser,
  mockCartRemoveItem,
  mockCartClearCart,
  mockUpsertCartItem,
  mockMergeGuestItems,
} = vi.hoisted(() => ({
  mockRequireRoleUser: vi.fn(),
  mockCartRemoveItem: vi.fn(),
  mockCartClearCart: vi.fn(),
  mockUpsertCartItem: vi.fn(),
  mockMergeGuestItems: vi.fn(),
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
  cartRepository: {
    removeItem: mockCartRemoveItem,
    clearCart: mockCartClearCart,
  },
}));

vi.mock("../../../../providers/auth-firebase/helpers", () => ({
  requireRoleUser: mockRequireRoleUser,
}));

vi.mock("./service", () => ({
  upsertCartItem: mockUpsertCartItem,
  mergeGuestItems: mockMergeGuestItems,
}));

import {
  addToCartAction,
  removeFromCartAction,
  clearCartAction,
  mergeGuestCartAction,
} from "../actions";

function makeUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-buyer-1", email: "buyer@test.com", name: "Buyer One", ...overrides };
}

function makeAddInput(overrides: Record<string, unknown> = {}) {
  return {
    productId: "product-hot-wheels-redline",
    productTitle: "Hot Wheels Redline",
    productImage: "/media/hw-redline.jpg",
    price: 50000,
    currency: "INR",
    quantity: 1,
    storeId: "store-diecast-depot",
    storeName: "Diecast Depot",
    listingType: "standard",
    ...overrides,
  };
}

describe("addToCartAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockUpsertCartItem.mockResolvedValue(undefined);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await addToCartAction(makeAddInput());
    expect(result.ok).toBe(false);
  });

  it("missing productId → { ok: false }", async () => {
    const { productId: _p, ...input } = makeAddInput();
    const result = await addToCartAction(input);
    expect(result.ok).toBe(false);
  });

  it("price <= 0 → { ok: false }", async () => {
    const result = await addToCartAction(makeAddInput({ price: 0 }));
    expect(result.ok).toBe(false);
  });

  it("quantity <= 0 → { ok: false }", async () => {
    const result = await addToCartAction(makeAddInput({ quantity: 0 }));
    expect(result.ok).toBe(false);
  });

  it("quantity > 99 → { ok: false }", async () => {
    const result = await addToCartAction(makeAddInput({ quantity: 100 }));
    expect(result.ok).toBe(false);
  });

  it("invalid listingType → { ok: false }", async () => {
    const result = await addToCartAction(makeAddInput({ listingType: "invalid-type" }));
    expect(result.ok).toBe(false);
  });

  it("valid → upsertCartItem called with userId and parsed data", async () => {
    await addToCartAction(makeAddInput());
    expect(mockUpsertCartItem).toHaveBeenCalledWith(
      "user-buyer-1",
      expect.objectContaining({ productId: "product-hot-wheels-redline" }),
    );
  });

  it("upsertCartItem throws (out of stock) → { ok: false }", async () => {
    mockUpsertCartItem.mockRejectedValue(new Error("Product is out of stock"));
    const result = await addToCartAction(makeAddInput());
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/out of stock/i);
  });

  it("success → { ok: true }", async () => {
    const result = await addToCartAction(makeAddInput());
    expect(result.ok).toBe(true);
  });
});

describe("removeFromCartAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockCartRemoveItem.mockResolvedValue(undefined);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await removeFromCartAction({ productId: "product-hot-wheels-redline" });
    expect(result.ok).toBe(false);
  });

  it("missing productId → { ok: false }", async () => {
    const result = await removeFromCartAction({});
    expect(result.ok).toBe(false);
  });

  it("valid → cartRepository.removeItem called with userId and productId", async () => {
    await removeFromCartAction({ productId: "product-hot-wheels-redline" });
    expect(mockCartRemoveItem).toHaveBeenCalledWith("user-buyer-1", "product-hot-wheels-redline");
  });

  it("success → { ok: true }", async () => {
    const result = await removeFromCartAction({ productId: "product-hot-wheels-redline" });
    expect(result.ok).toBe(true);
  });
});

describe("clearCartAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockCartClearCart.mockResolvedValue(undefined);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await clearCartAction();
    expect(result.ok).toBe(false);
  });

  it("valid → cartRepository.clearCart called with userId", async () => {
    await clearCartAction();
    expect(mockCartClearCart).toHaveBeenCalledWith("user-buyer-1");
  });

  it("success → { ok: true }", async () => {
    const result = await clearCartAction();
    expect(result.ok).toBe(true);
  });
});

describe("mergeGuestCartAction", () => {
  const guestItem = {
    productId: "product-hot-wheels-redline",
    productTitle: "Hot Wheels Redline",
    productImage: "/media/hw.jpg",
    price: 50000,
    currency: "INR",
    quantity: 1,
    storeId: "store-diecast-depot",
    storeName: "Diecast Depot",
    listingType: "standard" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockMergeGuestItems.mockResolvedValue(undefined);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await mergeGuestCartAction({ guestItems: [guestItem] });
    expect(result.ok).toBe(false);
  });

  it("empty guestItems → { ok: false } (schema min)", async () => {
    const result = await mergeGuestCartAction({ guestItems: [] });
    expect(result.ok).toBe(false);
  });

  it("missing guestItems → { ok: false }", async () => {
    const result = await mergeGuestCartAction({});
    expect(result.ok).toBe(false);
  });

  it("valid → mergeGuestItems called with userId and parsed items", async () => {
    await mergeGuestCartAction({ guestItems: [guestItem] });
    expect(mockMergeGuestItems).toHaveBeenCalledWith(
      "user-buyer-1",
      expect.arrayContaining([expect.objectContaining({ productId: "product-hot-wheels-redline" })]),
    );
  });

  it("success → { ok: true }", async () => {
    const result = await mergeGuestCartAction({ guestItems: [guestItem] });
    expect(result.ok).toBe(true);
  });
});
