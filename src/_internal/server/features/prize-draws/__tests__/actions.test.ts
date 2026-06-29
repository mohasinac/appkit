import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequireRoleUser,
  mockProductFindByIdOrSlug,
  mockProductUpdate,
  mockAssertPrizeDrawOpen,
} = vi.hoisted(() => ({
  mockRequireRoleUser: vi.fn(),
  mockProductFindByIdOrSlug: vi.fn(),
  mockProductUpdate: vi.fn(),
  mockAssertPrizeDrawOpen: vi.fn(),
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
    findByIdOrSlug: mockProductFindByIdOrSlug,
    update: mockProductUpdate,
  },
}));

vi.mock("../../../../providers/auth-firebase/helpers", () => ({
  requireRoleUser: mockRequireRoleUser,
}));

vi.mock("./service", () => ({
  assertPrizeDrawOpen: mockAssertPrizeDrawOpen,
}));

import { enterPrizeDrawAction } from "../actions";

function makeUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-buyer-1", email: "buyer@test.com", name: "Buyer One", ...overrides };
}

function makePrizeDraw(overrides: Record<string, unknown> = {}) {
  return {
    id: "preorder-dbz-prize-draw-goku",
    title: "DBZ Goku Prize Draw",
    listingType: "prize-draw",
    prizeCurrentEntries: 5,
    prizeMaxEntries: 100,
    ...overrides,
  };
}

describe("enterPrizeDrawAction — auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockProductFindByIdOrSlug.mockResolvedValue(makePrizeDraw());
    mockAssertPrizeDrawOpen.mockReturnValue(undefined);
    mockProductUpdate.mockResolvedValue(undefined);
  });

  it("unauthenticated (requireRoleUser throws) → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await enterPrizeDrawAction({ prizeDrawId: "preorder-dbz-prize-draw-goku" });
    expect(result.ok).toBe(false);
  });
});

describe("enterPrizeDrawAction — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockProductFindByIdOrSlug.mockResolvedValue(makePrizeDraw());
    mockAssertPrizeDrawOpen.mockReturnValue(undefined);
    mockProductUpdate.mockResolvedValue(undefined);
  });

  it("empty prizeDrawId → { ok: false, error: /required/i }", async () => {
    const result = await enterPrizeDrawAction({ prizeDrawId: "" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/required/i);
  });

  it("prizeDrawId missing entirely → { ok: false, error: /required/i }", async () => {
    const result = await enterPrizeDrawAction({});
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/required/i);
  });

  it("product not found (findByIdOrSlug returns null) → { ok: false, error: /not found/i }", async () => {
    mockProductFindByIdOrSlug.mockResolvedValue(null);
    const result = await enterPrizeDrawAction({ prizeDrawId: "preorder-missing" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/not found/i);
  });

  it("findByIdOrSlug throws → treated as not found → { ok: false, error: /not found/i }", async () => {
    mockProductFindByIdOrSlug.mockRejectedValue(new Error("DB error"));
    const result = await enterPrizeDrawAction({ prizeDrawId: "preorder-dbz-prize-draw-goku" });
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/not found/i);
  });

  it("assertPrizeDrawOpen throws (draw closed) → { ok: false }", async () => {
    mockAssertPrizeDrawOpen.mockImplementation(() => {
      throw new Error("Prize draw is no longer accepting entries");
    });
    const result = await enterPrizeDrawAction({ prizeDrawId: "preorder-dbz-prize-draw-goku" });
    expect(result.ok).toBe(false);
  });
});

describe("enterPrizeDrawAction — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser({ uid: "user-buyer-1" }));
    mockProductFindByIdOrSlug.mockResolvedValue(makePrizeDraw({ prizeCurrentEntries: 5 }));
    mockAssertPrizeDrawOpen.mockReturnValue(undefined);
    mockProductUpdate.mockResolvedValue(undefined);
  });

  it("valid → productRepository.update called with prizeCurrentEntries = current + 1", async () => {
    await enterPrizeDrawAction({ prizeDrawId: "preorder-dbz-prize-draw-goku" });
    expect(mockProductUpdate).toHaveBeenCalledWith(
      "preorder-dbz-prize-draw-goku",
      expect.objectContaining({ prizeCurrentEntries: 6 }),
    );
  });

  it("prizeCurrentEntries = 5 → updated to 6", async () => {
    await enterPrizeDrawAction({ prizeDrawId: "preorder-dbz-prize-draw-goku" });
    const updateArg = mockProductUpdate.mock.calls[0][1];
    expect(updateArg.prizeCurrentEntries).toBe(6);
  });

  it("prizeCurrentEntries undefined → updated to 1", async () => {
    mockProductFindByIdOrSlug.mockResolvedValue(makePrizeDraw({ prizeCurrentEntries: undefined }));
    await enterPrizeDrawAction({ prizeDrawId: "preorder-dbz-prize-draw-goku" });
    const updateArg = mockProductUpdate.mock.calls[0][1];
    expect(updateArg.prizeCurrentEntries).toBe(1);
  });

  it("valid → returns { ok: true, data: { entryRecorded: true, userId } }", async () => {
    const result = await enterPrizeDrawAction({ prizeDrawId: "preorder-dbz-prize-draw-goku" });
    expect(result.ok).toBe(true);
    expect((result as { data: Record<string, unknown> }).data).toMatchObject({
      entryRecorded: true,
      userId: "user-buyer-1",
    });
  });

  it("userId in result = authenticated user's uid", async () => {
    mockRequireRoleUser.mockResolvedValue(makeUser({ uid: "user-specific-uid" }));
    const result = await enterPrizeDrawAction({ prizeDrawId: "preorder-dbz-prize-draw-goku" });
    const data = (result as { data: { userId: string } }).data;
    expect(data.userId).toBe("user-specific-uid");
  });
});
