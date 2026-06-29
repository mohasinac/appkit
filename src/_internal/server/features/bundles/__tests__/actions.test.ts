import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockCategoriesFindBySlugAndType,
  mockCartAddItem,
  mockGetDefaultCurrency,
} = vi.hoisted(() => ({
  mockCategoriesFindBySlugAndType: vi.fn(),
  mockCartAddItem: vi.fn(),
  mockGetDefaultCurrency: vi.fn(),
}));

vi.mock("../../../../repositories", () => ({
  categoriesRepository: {
    findBySlugAndType: mockCategoriesFindBySlugAndType,
  },
}));

vi.mock("../../../../features/cart/repository/cart.repository", () => ({
  cartRepository: {
    addItem: mockCartAddItem,
  },
}));

vi.mock("../../../../core/baseline-resolver", () => ({
  getDefaultCurrency: mockGetDefaultCurrency,
}));

import { addBundleToCartAction } from "../actions";

function makeBundle(overrides: Record<string, unknown> = {}) {
  return {
    id: "bundle-pokemon-starter",
    slug: "bundle-pokemon-starter",
    name: "Pokémon Starter Bundle",
    isActive: true,
    bundleStockStatus: "in_stock",
    bundlePriceInPaise: 150000,
    bundleProductIds: ["product-charmander", "product-squirtle", "product-bulbasaur"],
    createdByStoreId: "store-pokemon-palace",
    createdByStoreName: "Pokemon Palace",
    display: { coverImage: "/media/bundle-starter.jpg" },
    ...overrides,
  };
}

describe("addBundleToCartAction — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDefaultCurrency.mockReturnValue("INR");
    mockCategoriesFindBySlugAndType.mockResolvedValue(makeBundle());
    mockCartAddItem.mockResolvedValue(undefined);
  });

  it("userId empty string → throws ValidationError('User id is required')", async () => {
    await expect(addBundleToCartAction("", "bundle-pokemon-starter")).rejects.toThrow("User id is required");
  });

  it("bundleSlug empty string → throws ValidationError('Bundle slug is required')", async () => {
    await expect(addBundleToCartAction("user-buyer-1", "")).rejects.toThrow("Bundle slug is required");
  });

  it("bundle not found (findBySlugAndType returns null) → throws NotFoundError('Bundle not found')", async () => {
    mockCategoriesFindBySlugAndType.mockResolvedValue(null);
    await expect(addBundleToCartAction("user-buyer-1", "bundle-missing")).rejects.toThrow("Bundle not found");
  });

  it("bundle.isActive === false → throws ValidationError('Bundle is not available')", async () => {
    mockCategoriesFindBySlugAndType.mockResolvedValue(makeBundle({ isActive: false }));
    await expect(addBundleToCartAction("user-buyer-1", "bundle-pokemon-starter")).rejects.toThrow("Bundle is not available");
  });

  it("bundle.bundleStockStatus === 'out_of_stock' → throws ValidationError(/out of stock/i)", async () => {
    mockCategoriesFindBySlugAndType.mockResolvedValue(makeBundle({ bundleStockStatus: "out_of_stock" }));
    await expect(addBundleToCartAction("user-buyer-1", "bundle-pokemon-starter")).rejects.toThrow(/out of stock/i);
  });

  it("bundle.bundlePriceInPaise === 0 → throws ValidationError(/price is not configured/i)", async () => {
    mockCategoriesFindBySlugAndType.mockResolvedValue(makeBundle({ bundlePriceInPaise: 0 }));
    await expect(addBundleToCartAction("user-buyer-1", "bundle-pokemon-starter")).rejects.toThrow(/price is not configured/i);
  });

  it("bundle.bundlePriceInPaise < 1 → throws ValidationError(/price is not configured/i)", async () => {
    mockCategoriesFindBySlugAndType.mockResolvedValue(makeBundle({ bundlePriceInPaise: -100 }));
    await expect(addBundleToCartAction("user-buyer-1", "bundle-pokemon-starter")).rejects.toThrow(/price is not configured/i);
  });
});

describe("addBundleToCartAction — success path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDefaultCurrency.mockReturnValue("INR");
    mockCategoriesFindBySlugAndType.mockResolvedValue(makeBundle());
    mockCartAddItem.mockResolvedValue(undefined);
  });

  it("valid bundle → cartRepository.addItem called with userId", async () => {
    await addBundleToCartAction("user-buyer-1", "bundle-pokemon-starter");
    expect(mockCartAddItem).toHaveBeenCalledWith("user-buyer-1", expect.any(Object));
  });

  it("valid bundle → addItem called with bundleCategorySlug = bundle.slug", async () => {
    await addBundleToCartAction("user-buyer-1", "bundle-pokemon-starter");
    const item = mockCartAddItem.mock.calls[0][1];
    expect(item.bundleCategorySlug).toBe("bundle-pokemon-starter");
  });

  it("valid bundle → addItem called with bundleProductIds = bundle.bundleProductIds", async () => {
    await addBundleToCartAction("user-buyer-1", "bundle-pokemon-starter");
    const item = mockCartAddItem.mock.calls[0][1];
    expect(item.bundleProductIds).toEqual(["product-charmander", "product-squirtle", "product-bulbasaur"]);
  });

  it("valid bundle → addItem called with price = bundle.bundlePriceInPaise", async () => {
    await addBundleToCartAction("user-buyer-1", "bundle-pokemon-starter");
    const item = mockCartAddItem.mock.calls[0][1];
    expect(item.price).toBe(150000);
  });

  it("valid bundle → addItem called with quantity: 1", async () => {
    await addBundleToCartAction("user-buyer-1", "bundle-pokemon-starter");
    const item = mockCartAddItem.mock.calls[0][1];
    expect(item.quantity).toBe(1);
  });

  it("valid bundle → addItem called with listingType: 'standard'", async () => {
    await addBundleToCartAction("user-buyer-1", "bundle-pokemon-starter");
    const item = mockCartAddItem.mock.calls[0][1];
    expect(item.listingType).toBe("standard");
  });

  it("valid bundle → resolves (Promise<void>)", async () => {
    await expect(addBundleToCartAction("user-buyer-1", "bundle-pokemon-starter")).resolves.toBeUndefined();
  });

  it("bundle.display.coverImage present → addItem called with productImage = coverImage", async () => {
    await addBundleToCartAction("user-buyer-1", "bundle-pokemon-starter");
    const item = mockCartAddItem.mock.calls[0][1];
    expect(item.productImage).toBe("/media/bundle-starter.jpg");
  });

  it("bundle.display undefined → addItem called with productImage = ''", async () => {
    mockCategoriesFindBySlugAndType.mockResolvedValue(makeBundle({ display: undefined }));
    await addBundleToCartAction("user-buyer-1", "bundle-pokemon-starter");
    const item = mockCartAddItem.mock.calls[0][1];
    expect(item.productImage).toBe("");
  });
});
