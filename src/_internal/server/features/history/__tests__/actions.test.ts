import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequireRoleUser,
  mockHistoryTrack,
  mockHistoryMerge,
} = vi.hoisted(() => ({
  mockRequireRoleUser: vi.fn(),
  mockHistoryTrack: vi.fn(),
  mockHistoryMerge: vi.fn(),
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
  historyRepository: {
    track: mockHistoryTrack,
    merge: mockHistoryMerge,
  },
}));

vi.mock("../../../../providers/auth-firebase/helpers", () => ({
  requireRoleUser: mockRequireRoleUser,
}));

import { trackProductViewAction, mergeGuestHistoryAction } from "../actions";

function makeUser(overrides: Record<string, unknown> = {}) {
  return { uid: "user-buyer-1", email: "buyer@test.com", name: "Buyer One", ...overrides };
}

function makeSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    title: "Charizard PSA 9",
    imageUrl: "/media/charizard.jpg",
    price: 500000,
    ...overrides,
  };
}

describe("trackProductViewAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockHistoryTrack.mockResolvedValue(undefined);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await trackProductViewAction("product-charizard-psa9", "standard");
    expect(result.ok).toBe(false);
  });

  it("valid auth user → historyRepository.track called with userId and productId", async () => {
    await trackProductViewAction("product-charizard-psa9", "standard");
    expect(mockHistoryTrack).toHaveBeenCalledWith(
      "user-buyer-1",
      expect.objectContaining({ productId: "product-charizard-psa9", productType: "standard" }),
    );
  });

  it("valid with snapshot → snapshot passed to track", async () => {
    const snapshot = makeSnapshot();
    await trackProductViewAction("product-charizard-psa9", "standard", snapshot);
    expect(mockHistoryTrack).toHaveBeenCalledWith(
      "user-buyer-1",
      expect.objectContaining({ productSnapshot: snapshot }),
    );
  });

  it("no snapshot provided → track called without productSnapshot", async () => {
    await trackProductViewAction("product-charizard-psa9", "auction");
    expect(mockHistoryTrack).toHaveBeenCalledWith(
      "user-buyer-1",
      expect.objectContaining({ productType: "auction" }),
    );
  });

  it("success → { ok: true }", async () => {
    const result = await trackProductViewAction("product-charizard-psa9", "standard");
    expect(result.ok).toBe(true);
  });

  it("historyRepository.track throws → { ok: false }", async () => {
    mockHistoryTrack.mockRejectedValue(new Error("Firestore write failed"));
    const result = await trackProductViewAction("product-charizard-psa9", "standard");
    expect(result.ok).toBe(false);
  });
});

describe("mergeGuestHistoryAction", () => {
  const guestItems = [
    { productId: "product-charizard-psa9", productType: "standard" as const, viewedAt: new Date() },
    { productId: "auction-pikachu-1st-ed", productType: "auction" as const },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRoleUser.mockResolvedValue(makeUser());
    mockHistoryMerge.mockResolvedValue(undefined);
  });

  it("unauthenticated → { ok: false }", async () => {
    mockRequireRoleUser.mockRejectedValue(new Error("Unauthorized"));
    const result = await mergeGuestHistoryAction(guestItems);
    expect(result.ok).toBe(false);
  });

  it("empty guestItems → no historyRepository.merge called still", async () => {
    const result = await mergeGuestHistoryAction([]);
    expect(result.ok).toBe(true);
    expect(mockHistoryMerge).toHaveBeenCalledWith("user-buyer-1", []);
  });

  it("valid items → historyRepository.merge called with userId and items", async () => {
    await mergeGuestHistoryAction(guestItems);
    expect(mockHistoryMerge).toHaveBeenCalledWith("user-buyer-1", guestItems);
  });

  it("merge error → { ok: false }", async () => {
    mockHistoryMerge.mockRejectedValue(new Error("Merge failed"));
    const result = await mergeGuestHistoryAction(guestItems);
    expect(result.ok).toBe(false);
  });

  it("success → { ok: true }", async () => {
    const result = await mergeGuestHistoryAction(guestItems);
    expect(result.ok).toBe(true);
  });
});
