import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequireRoleUser,
  mockProductCreate,
  mockProductUpdate,
  mockProductDelete,
  mockAssertProductOwnership,
  mockAssertStatusTransition,
  mockIsAdminUser,
} = vi.hoisted(() => ({
  mockRequireRoleUser: vi.fn(),
  mockProductCreate: vi.fn(),
  mockProductUpdate: vi.fn(),
  mockProductDelete: vi.fn(),
  mockAssertProductOwnership: vi.fn(),
  mockAssertStatusTransition: vi.fn(),
  mockIsAdminUser: vi.fn(),
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
  productRepository: {
    create: mockProductCreate,
    update: mockProductUpdate,
    delete: mockProductDelete,
  },
}));

vi.mock("../../../../providers/auth-firebase/helpers", () => ({
  requireRoleUser: mockRequireRoleUser,
}));

vi.mock("./service", () => ({
  assertProductOwnership: mockAssertProductOwnership,
  assertStatusTransition: mockAssertStatusTransition,
}));

vi.mock("../../../../features/auth/role-predicates", () => ({
  isAdminUser: mockIsAdminUser,
}));

import {
  createProductAction,
  createAuctionAction,
  updateProductAction,
  deleteProductAction,
  setProductStatusAction,
  setProductFeaturedAction,
} from "../actions";

function makeSellerUser(overrides: Record<string, unknown> = {}) {
  return { uid: "store-seller-1", email: "seller@test.com", name: "Seller One", ...overrides };
}

function makeAdminUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-admin-1", email: "admin@test.com", name: "Admin User", ...overrides };
}

function makeProductDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "product-hot-wheels-redline",
    title: "Hot Wheels Redline",
    storeId: "store-seller-1",
    listingType: "standard",
    status: "draft",
    price: 50000,
    stockQuantity: 5,
    ...overrides,
  };
}

function makeProductInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Hot Wheels Redline",
    description: "Vintage Hot Wheels Redline car in excellent condition.",
    price: 50000,
    stockQuantity: 5,
    categorySlug: "category-diecast-vehicles",
    brandSlug: "brand-hot-wheels",
    condition: "excellent",
    currency: "INR",
    images: ["/media/hw-redline.jpg"],
    ...overrides,
  };
}

function makeAuctionInput(overrides: Record<string, unknown> = {}) {
  return {
    ...makeProductInput(),
    startingBid: 10000,
    auctionEndDate: new Date(Date.now() + 172800000),
    bidIncrement: 1000,
    ...overrides,
  };
}

describe("createProductAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeSellerUser());
    mockProductCreate.mockResolvedValue(makeProductDoc());
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await createProductAction(makeProductInput());
    expect(result.ok).toBe(false);
  });

  it("buyer role (not seller/admin) → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Insufficient role"));
    const result = await createProductAction(makeProductInput());
    expect(result.ok).toBe(false);
  });

  it("missing title → { ok: false }", async () => {
    const { title: _t, ...input } = makeProductInput();
    const result = await createProductAction(input);
    expect(result.ok).toBe(false);
  });

  it("price <= 0 → { ok: false }", async () => {
    const result = await createProductAction(makeProductInput({ price: 0 }));
    expect(result.ok).toBe(false);
  });

  it("stockQuantity < 0 → { ok: false }", async () => {
    const result = await createProductAction(makeProductInput({ stockQuantity: -1 }));
    expect(result.ok).toBe(false);
  });

  it("valid → productRepository.create called with listingType: standard", async () => {
    await createProductAction(makeProductInput());
    expect(mockProductCreate).toHaveBeenCalledWith(
      expect.objectContaining({ listingType: "standard", status: "draft", storeId: "store-seller-1" }),
    );
  });

  it("success → { ok: true, data: product }", async () => {
    const product = makeProductDoc();
    mockProductCreate.mockResolvedValue(product);
    const result = await createProductAction(makeProductInput());
    expect(result.ok).toBe(true);
    expect((result as { data: unknown }).data).toEqual(product);
  });
});

describe("createAuctionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeSellerUser());
    mockProductCreate.mockResolvedValue(makeProductDoc({ listingType: "auction" }));
  });

  it("valid auction → productRepository.create called with listingType: auction", async () => {
    await createAuctionAction(makeAuctionInput());
    expect(mockProductCreate).toHaveBeenCalledWith(
      expect.objectContaining({ listingType: "auction", status: "draft" }),
    );
  });

  it("missing startingBid → { ok: false }", async () => {
    const { startingBid: _s, ...input } = makeAuctionInput();
    const result = await createAuctionAction(input);
    expect(result.ok).toBe(false);
  });

  it("missing auctionEndDate → { ok: false }", async () => {
    const { auctionEndDate: _d, ...input } = makeAuctionInput();
    const result = await createAuctionAction(input);
    expect(result.ok).toBe(false);
  });
});

describe("updateProductAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeSellerUser());
    mockAssertProductOwnership.mockResolvedValue(makeProductDoc());
    mockProductUpdate.mockResolvedValue(makeProductDoc({ title: "Updated Title" }));
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await updateProductAction("product-hot-wheels-redline", { title: "Updated" });
    expect(result.ok).toBe(false);
  });

  it("non-owner non-admin (assertProductOwnership throws) → { ok: false }", async () => {
    mockAssertProductOwnership.mockRejectedValue(new Error("Forbidden"));
    const result = await updateProductAction("product-hot-wheels-redline", { title: "Updated" });
    expect(result.ok).toBe(false);
  });

  it("valid → productRepository.update called with productId", async () => {
    await updateProductAction("product-hot-wheels-redline", { title: "Updated Title" });
    expect(mockProductUpdate).toHaveBeenCalledWith(
      "product-hot-wheels-redline",
      expect.objectContaining({ title: "Updated Title" }),
    );
  });
});

describe("deleteProductAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeSellerUser());
    mockAssertProductOwnership.mockResolvedValue(makeProductDoc());
    mockProductDelete.mockResolvedValue(undefined);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await deleteProductAction("product-hot-wheels-redline");
    expect(result.ok).toBe(false);
  });

  it("non-owner non-admin → { ok: false }", async () => {
    mockAssertProductOwnership.mockRejectedValue(new Error("Forbidden"));
    const result = await deleteProductAction("product-hot-wheels-redline");
    expect(result.ok).toBe(false);
  });

  it("valid → productRepository.delete called", async () => {
    await deleteProductAction("product-hot-wheels-redline");
    expect(mockProductDelete).toHaveBeenCalledWith("product-hot-wheels-redline");
  });
});

describe("setProductStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeSellerUser());
    mockIsAdminUser.mockReturnValue(false);
    mockAssertProductOwnership.mockResolvedValue(makeProductDoc({ status: "draft", listingType: "standard" }));
    mockAssertStatusTransition.mockReturnValue(undefined);
    mockProductUpdate.mockResolvedValue(undefined);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await setProductStatusAction({ productId: "product-hot-wheels-redline", status: "published" });
    expect(result.ok).toBe(false);
  });

  it("invalid status value → { ok: false }", async () => {
    const result = await setProductStatusAction({ productId: "product-hot-wheels-redline", status: "invalid-status" });
    expect(result.ok).toBe(false);
  });

  it("non-owner (assertProductOwnership throws) → { ok: false }", async () => {
    mockAssertProductOwnership.mockRejectedValue(new Error("Forbidden"));
    const result = await setProductStatusAction({ productId: "product-hot-wheels-redline", status: "published" });
    expect(result.ok).toBe(false);
  });

  it("invalid status transition (assertStatusTransition throws) → { ok: false }", async () => {
    mockAssertStatusTransition.mockImplementation(() => {
      throw new Error("Invalid status transition");
    });
    const result = await setProductStatusAction({ productId: "product-hot-wheels-redline", status: "published" });
    expect(result.ok).toBe(false);
  });

  it("live listing not vendor-verified + non-admin trying to publish → { ok: false }", async () => {
    mockAssertProductOwnership.mockResolvedValue(
      makeProductDoc({ listingType: "live", liveItem: { vendorVerified: false } }),
    );
    const result = await setProductStatusAction({ productId: "product-hot-wheels-redline", status: "published" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/verification/i);
  });

  it("live listing vendor-verified → admin can publish", async () => {
    mockRequireRoleUser.mockResolvedValue(makeAdminUser());
    mockIsAdminUser.mockReturnValue(true);
    mockAssertProductOwnership.mockResolvedValue(
      makeProductDoc({ listingType: "live", liveItem: { vendorVerified: false } }),
    );
    const result = await setProductStatusAction({ productId: "product-hot-wheels-redline", status: "published" });
    expect(result.ok).toBe(true);
  });

  it("valid standard listing → productRepository.update called with status", async () => {
    await setProductStatusAction({ productId: "product-hot-wheels-redline", status: "published" });
    expect(mockProductUpdate).toHaveBeenCalledWith(
      "product-hot-wheels-redline",
      { status: "published" },
    );
  });
});

describe("setProductFeaturedAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeAdminUser());
    mockProductUpdate.mockResolvedValue(undefined);
  });

  it("non-admin → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Insufficient role"));
    const result = await setProductFeaturedAction({ productId: "product-hot-wheels-redline", featured: true });
    expect(result.ok).toBe(false);
  });

  it("valid → productRepository.update called with featured flag", async () => {
    await setProductFeaturedAction({ productId: "product-hot-wheels-redline", featured: true });
    expect(mockProductUpdate).toHaveBeenCalledWith(
      "product-hot-wheels-redline",
      { featured: true },
    );
  });
});
