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

import { startDigitalCodeConversationAction } from "../actions";

function makeUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-buyer-1", email: "buyer@test.com", name: "Buyer One", ...overrides };
}

function makeDigitalProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "digitalcode-steam-cyberpunk-2077",
    title: "Steam - Cyberpunk 2077",
    storeId: "store-digital-games",
    listingType: "digital-code",
    ...overrides,
  };
}

function makeStore(overrides: Record<string, unknown> = {}) {
  return { id: "store-digital-games", storeName: "Digital Games Hub", ...overrides };
}

describe("startDigitalCodeConversationAction — auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockProductFindByIdOrSlug.mockResolvedValue(makeDigitalProduct());
    mockStoreFindById.mockResolvedValue(makeStore());
    mockConversationFindOrCreate.mockResolvedValue({ id: "conv-abc" });
  });

  it("unauthenticated (requireRoleUser throws) → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await startDigitalCodeConversationAction({ productId: "digitalcode-steam-cyberpunk-2077" });
    expect(result.ok).toBe(false);
  });
});

describe("startDigitalCodeConversationAction — product guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockStoreFindById.mockResolvedValue(makeStore());
    mockConversationFindOrCreate.mockResolvedValue({ id: "conv-abc" });
  });

  it("product not found → { ok: false, error: /not found/i }", async () => {
    mockProductFindByIdOrSlug.mockResolvedValue(null);
    const result = await startDigitalCodeConversationAction({ productId: "digitalcode-missing" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/not found/i);
  });

  it("product listingType === 'classified' (not digital-code) → { ok: false, error: /not a digital-code/i }", async () => {
    mockProductFindByIdOrSlug.mockResolvedValue(makeDigitalProduct({ listingType: "classified" }));
    const result = await startDigitalCodeConversationAction({ productId: "classified-1" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/not a digital-code/i);
  });

  it("product listingType === 'standard' → { ok: false, error: /not a digital-code/i }", async () => {
    mockProductFindByIdOrSlug.mockResolvedValue(makeDigitalProduct({ listingType: "standard" }));
    const result = await startDigitalCodeConversationAction({ productId: "product-1" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/not a digital-code/i);
  });
});

describe("startDigitalCodeConversationAction — store guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockProductFindByIdOrSlug.mockResolvedValue(makeDigitalProduct());
    mockConversationFindOrCreate.mockResolvedValue({ id: "conv-abc" });
  });

  it("product listingType === 'digital-code' but store not found → { ok: false, error: /store not found/i }", async () => {
    mockStoreFindById.mockResolvedValue(null);
    const result = await startDigitalCodeConversationAction({ productId: "digitalcode-steam-cyberpunk-2077" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/store not found/i);
  });
});

describe("startDigitalCodeConversationAction — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockProductFindByIdOrSlug.mockResolvedValue(makeDigitalProduct());
    mockStoreFindById.mockResolvedValue(makeStore());
    mockConversationFindOrCreate.mockResolvedValue({ id: "conv-abc123", buyerId: "user-buyer-1" });
  });

  it("valid → findOrCreateByContext called with buyerId = user.uid", async () => {
    await startDigitalCodeConversationAction({ productId: "digitalcode-steam-cyberpunk-2077" });
    expect(mockConversationFindOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ buyerId: "user-buyer-1" }),
    );
  });

  it("valid → findOrCreateByContext called with storeId = product.storeId", async () => {
    await startDigitalCodeConversationAction({ productId: "digitalcode-steam-cyberpunk-2077" });
    expect(mockConversationFindOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store-digital-games" }),
    );
  });

  it("valid → findOrCreateByContext called with productId = product.id", async () => {
    await startDigitalCodeConversationAction({ productId: "digitalcode-steam-cyberpunk-2077" });
    expect(mockConversationFindOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ productId: "digitalcode-steam-cyberpunk-2077" }),
    );
  });

  it("valid → returns { ok: true, data: ConversationDocument }", async () => {
    const conv = { id: "conv-abc123", buyerId: "user-buyer-1" };
    mockConversationFindOrCreate.mockResolvedValue(conv);
    const result = await startDigitalCodeConversationAction({ productId: "digitalcode-steam-cyberpunk-2077" });
    expect(result.ok).toBe(true);
    expect((result as { data: unknown }).data).toEqual(conv);
  });
});
