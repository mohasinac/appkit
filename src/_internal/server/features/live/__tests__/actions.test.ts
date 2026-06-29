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

import { startLiveConversationAction } from "../actions";

function makeUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-buyer-1", email: "buyer@test.com", name: "Buyer One", ...overrides };
}

function makeLiveProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "live-axolotl-leucistic-juvenile",
    title: "Axolotl - Leucistic Juvenile",
    storeId: "store-exotic-pets",
    listingType: "live",
    ...overrides,
  };
}

function makeStore(overrides: Record<string, unknown> = {}) {
  return { id: "store-exotic-pets", storeName: "Exotic Pets India", ...overrides };
}

describe("startLiveConversationAction — auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockProductFindByIdOrSlug.mockResolvedValue(makeLiveProduct());
    mockStoreFindById.mockResolvedValue(makeStore());
    mockConversationFindOrCreate.mockResolvedValue({ id: "conv-live-1" });
  });

  it("unauthenticated (requireRoleUser throws) → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await startLiveConversationAction({ productId: "live-axolotl-leucistic-juvenile" });
    expect(result.ok).toBe(false);
  });
});

describe("startLiveConversationAction — product guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockStoreFindById.mockResolvedValue(makeStore());
    mockConversationFindOrCreate.mockResolvedValue({ id: "conv-live-1" });
  });

  it("product not found → { ok: false, error: /not found/i }", async () => {
    mockProductFindByIdOrSlug.mockResolvedValue(null);
    const result = await startLiveConversationAction({ productId: "live-missing" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/not found/i);
  });

  it("product listingType === 'classified' (not live) → { ok: false, error: /not a live/i }", async () => {
    mockProductFindByIdOrSlug.mockResolvedValue(makeLiveProduct({ listingType: "classified" }));
    const result = await startLiveConversationAction({ productId: "classified-1" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/not a live/i);
  });

  it("product listingType === 'standard' → { ok: false, error: /not a live/i }", async () => {
    mockProductFindByIdOrSlug.mockResolvedValue(makeLiveProduct({ listingType: "standard" }));
    const result = await startLiveConversationAction({ productId: "product-1" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/not a live/i);
  });
});

describe("startLiveConversationAction — store guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockProductFindByIdOrSlug.mockResolvedValue(makeLiveProduct());
    mockConversationFindOrCreate.mockResolvedValue({ id: "conv-live-1" });
  });

  it("product listingType === 'live' but store not found → { ok: false, error: /store not found/i }", async () => {
    mockStoreFindById.mockResolvedValue(null);
    const result = await startLiveConversationAction({ productId: "live-axolotl-leucistic-juvenile" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/store not found/i);
  });
});

describe("startLiveConversationAction — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockProductFindByIdOrSlug.mockResolvedValue(makeLiveProduct());
    mockStoreFindById.mockResolvedValue(makeStore());
    mockConversationFindOrCreate.mockResolvedValue({ id: "conv-live-1", buyerId: "user-buyer-1" });
  });

  it("valid → findOrCreateByContext called with buyerId = user.uid", async () => {
    await startLiveConversationAction({ productId: "live-axolotl-leucistic-juvenile" });
    expect(mockConversationFindOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ buyerId: "user-buyer-1" }),
    );
  });

  it("valid → findOrCreateByContext called with storeId = product.storeId", async () => {
    await startLiveConversationAction({ productId: "live-axolotl-leucistic-juvenile" });
    expect(mockConversationFindOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store-exotic-pets" }),
    );
  });

  it("valid → returns { ok: true, data: ConversationDocument }", async () => {
    const conv = { id: "conv-live-1", buyerId: "user-buyer-1" };
    mockConversationFindOrCreate.mockResolvedValue(conv);
    const result = await startLiveConversationAction({ productId: "live-axolotl-leucistic-juvenile" });
    expect(result.ok).toBe(true);
    expect((result as { data: unknown }).data).toEqual(conv);
  });
});
