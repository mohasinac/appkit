import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequireRoleUser,
  mockProductFindByIdOrSlug,
  mockStoreFindById,
  mockConversationFindOrCreate,
} = vi.hoisted(() => ({
  mockRequireRoleUser: vi.fn(),
  mockProductFindByIdOrSlug: vi.fn(),
  mockStoreFindById: vi.fn(),
  mockConversationFindOrCreate: vi.fn(),
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

vi.mock("../../../../features/messages/repository/conversations.repository", () => ({
  conversationsRepository: {
    findOrCreateByContext: mockConversationFindOrCreate,
  },
}));

vi.mock("../../../../providers/auth-firebase/helpers", () => ({
  requireRoleUser: mockRequireRoleUser,
}));

vi.mock("../../../../repositories", () => ({
  storeRepository: {
    findById: mockStoreFindById,
  },
  productRepository: {
    findByIdOrSlug: mockProductFindByIdOrSlug,
  },
}));

import { startClassifiedConversationAction } from "../actions";

function makeUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-buyer-1", email: "buyer@test.com", name: "Buyer One", ...overrides };
}

function makeClassifiedProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "classified-vintage-funko-bangalore",
    title: "Vintage Funko Pop - Bangalore Meetup",
    storeId: "store-seller-1",
    listingType: "classified",
    ...overrides,
  };
}

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    id: "store-seller-1",
    storeName: "Vintage Vault",
    ...overrides,
  };
}

function makeConversation(overrides: Record<string, unknown> = {}) {
  return {
    id: "conv-abc123",
    buyerId: "user-buyer-1",
    storeId: "store-seller-1",
    productId: "classified-vintage-funko-bangalore",
    ...overrides,
  };
}

describe("startClassifiedConversationAction — auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockProductFindByIdOrSlug.mockResolvedValue(makeClassifiedProduct());
    mockStoreFindById.mockResolvedValue(makeStore());
    mockConversationFindOrCreate.mockResolvedValue(makeConversation());
  });

  it("unauthenticated (requireRoleUser throws) → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await startClassifiedConversationAction({ productId: "classified-vintage-funko-bangalore" });
    expect(result.ok).toBe(false);
  });
});

describe("startClassifiedConversationAction — product guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockStoreFindById.mockResolvedValue(makeStore());
    mockConversationFindOrCreate.mockResolvedValue(makeConversation());
  });

  it("product not found (findByIdOrSlug returns null) → { ok: false, error: /not found/i }", async () => {
    mockProductFindByIdOrSlug.mockResolvedValue(null);
    const result = await startClassifiedConversationAction({ productId: "classified-missing" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/not found/i);
  });

  it("product listingType === 'standard' → { ok: false, error: /not a classified/i }", async () => {
    mockProductFindByIdOrSlug.mockResolvedValue(makeClassifiedProduct({ listingType: "standard" }));
    const result = await startClassifiedConversationAction({ productId: "product-standard-1" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/not a classified/i);
  });

  it("product listingType === 'auction' → { ok: false, error: /not a classified/i }", async () => {
    mockProductFindByIdOrSlug.mockResolvedValue(makeClassifiedProduct({ listingType: "auction" }));
    const result = await startClassifiedConversationAction({ productId: "auction-1" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/not a classified/i);
  });
});

describe("startClassifiedConversationAction — store guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockProductFindByIdOrSlug.mockResolvedValue(makeClassifiedProduct());
    mockConversationFindOrCreate.mockResolvedValue(makeConversation());
  });

  it("product listingType === 'classified' but store not found → { ok: false, error: /store not found/i }", async () => {
    mockStoreFindById.mockResolvedValue(null);
    const result = await startClassifiedConversationAction({ productId: "classified-vintage-funko-bangalore" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/store not found/i);
  });
});

describe("startClassifiedConversationAction — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockProductFindByIdOrSlug.mockResolvedValue(makeClassifiedProduct());
    mockStoreFindById.mockResolvedValue(makeStore());
    mockConversationFindOrCreate.mockResolvedValue(makeConversation());
  });

  it("valid → conversationsRepository.findOrCreateByContext called with buyerId = user.uid", async () => {
    await startClassifiedConversationAction({ productId: "classified-vintage-funko-bangalore" });
    expect(mockConversationFindOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ buyerId: "user-buyer-1" }),
    );
  });

  it("valid → findOrCreateByContext called with storeId = product.storeId", async () => {
    await startClassifiedConversationAction({ productId: "classified-vintage-funko-bangalore" });
    expect(mockConversationFindOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store-seller-1" }),
    );
  });

  it("valid → findOrCreateByContext called with productId = product.id", async () => {
    await startClassifiedConversationAction({ productId: "classified-vintage-funko-bangalore" });
    expect(mockConversationFindOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ productId: "classified-vintage-funko-bangalore" }),
    );
  });

  it("valid → findOrCreateByContext called with productTitle = product.title", async () => {
    await startClassifiedConversationAction({ productId: "classified-vintage-funko-bangalore" });
    expect(mockConversationFindOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ productTitle: "Vintage Funko Pop - Bangalore Meetup" }),
    );
  });

  it("valid → findOrCreateByContext called with storeName = store.storeName", async () => {
    await startClassifiedConversationAction({ productId: "classified-vintage-funko-bangalore" });
    expect(mockConversationFindOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ storeName: "Vintage Vault" }),
    );
  });

  it("valid → returns { ok: true, data: ConversationDocument }", async () => {
    const conv = makeConversation();
    mockConversationFindOrCreate.mockResolvedValue(conv);
    const result = await startClassifiedConversationAction({ productId: "classified-vintage-funko-bangalore" });
    expect(result.ok).toBe(true);
    expect((result as { data: unknown }).data).toEqual(conv);
  });

  it("idempotent: second call → findOrCreateByContext called again (repository deduplicates)", async () => {
    await startClassifiedConversationAction({ productId: "classified-vintage-funko-bangalore" });
    await startClassifiedConversationAction({ productId: "classified-vintage-funko-bangalore" });
    expect(mockConversationFindOrCreate).toHaveBeenCalledTimes(2);
  });
});
