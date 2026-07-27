import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks ---

const mockApiPost = vi.fn();
const mockApiDelete = vi.fn();
const mockGetCartOps = vi.fn();
const mockClearCartOps = vi.fn();
const mockGetWishlistOps = vi.fn();
const mockClearWishlistOps = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock("../../http", () => ({
  apiClient: {
    post: mockApiPost,
    delete: mockApiDelete,
  },
}));

vi.mock("../../features/cart/utils/pending-ops", () => ({
  getCartOps: mockGetCartOps,
  clearCartOps: mockClearCartOps,
  getWishlistOps: mockGetWishlistOps,
  clearWishlistOps: mockClearWishlistOps,
}));

import { useSyncManager } from "../useSyncManager";

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // Override invalidateQueries to track calls
  queryClient.invalidateQueries = mockInvalidateQueries;
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const SYNC_INTERVAL_MS = 30_000;

describe("useSyncManager — unauthenticated (no userId)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGetCartOps.mockReturnValue([]);
    mockGetWishlistOps.mockReturnValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does nothing when userId is null — no API calls made", async () => {
    renderHook(() => useSyncManager(null), { wrapper: makeWrapper() });
    await act(() => Promise.resolve());
    expect(mockApiPost).not.toHaveBeenCalled();
    expect(mockApiDelete).not.toHaveBeenCalled();
  });

  it("does nothing when userId is undefined", async () => {
    renderHook(() => useSyncManager(undefined), { wrapper: makeWrapper() });
    await act(() => Promise.resolve());
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it("does not call clearCartOps when not syncing", async () => {
    renderHook(() => useSyncManager(null), { wrapper: makeWrapper() });
    await act(() => Promise.resolve());
    expect(mockClearCartOps).not.toHaveBeenCalled();
  });
});

describe("useSyncManager — authenticated with pending cart ops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockApiPost.mockResolvedValue({});
    mockApiDelete.mockResolvedValue({});
    mockGetWishlistOps.mockReturnValue([]);
    mockClearCartOps.mockReturnValue(undefined);
    mockClearWishlistOps.mockReturnValue(undefined);
    mockInvalidateQueries.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("syncs immediately on mount with userId", async () => {
    mockGetCartOps.mockReturnValue([
      { op: "add", productId: "product-1", quantity: 1 },
    ]);
    renderHook(() => useSyncManager("user-abc"), { wrapper: makeWrapper() });
    await act(() => Promise.resolve());
    expect(mockApiPost).toHaveBeenCalledWith("/api/cart", {
      productId: "product-1",
      quantity: 1,
    });
  });

  it("replays 'add' cart op via POST /api/cart", async () => {
    mockGetCartOps.mockReturnValue([
      { op: "add", productId: "product-charizard", quantity: 2 },
    ]);
    renderHook(() => useSyncManager("user-abc"), { wrapper: makeWrapper() });
    await act(() => Promise.resolve());
    expect(mockApiPost).toHaveBeenCalledWith("/api/cart", {
      productId: "product-charizard",
      quantity: 2,
    });
  });

  it("replays 'add' cart op with default quantity 1 when quantity not specified", async () => {
    mockGetCartOps.mockReturnValue([{ op: "add", productId: "product-1" }]);
    renderHook(() => useSyncManager("user-abc"), { wrapper: makeWrapper() });
    await act(() => Promise.resolve());
    expect(mockApiPost).toHaveBeenCalledWith("/api/cart", {
      productId: "product-1",
      quantity: 1,
    });
  });

  it("replays 'remove' cart op via DELETE /api/cart/{productId}", async () => {
    mockGetCartOps.mockReturnValue([{ op: "remove", productId: "product-pikachu" }]);
    renderHook(() => useSyncManager("user-abc"), { wrapper: makeWrapper() });
    await act(() => Promise.resolve());
    expect(mockApiDelete).toHaveBeenCalledWith("/api/cart/product-pikachu");
  });

  it("clears cart ops after replay", async () => {
    mockGetCartOps.mockReturnValue([{ op: "add", productId: "product-1", quantity: 1 }]);
    renderHook(() => useSyncManager("user-abc"), { wrapper: makeWrapper() });
    await act(() => Promise.resolve());
    expect(mockClearCartOps).toHaveBeenCalledTimes(1);
  });

  it("invalidates cart query when there were pending cart ops", async () => {
    mockGetCartOps.mockReturnValue([{ op: "add", productId: "p1", quantity: 1 }]);
    renderHook(() => useSyncManager("user-abc"), { wrapper: makeWrapper() });
    await act(() => Promise.resolve());
    expect(mockInvalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["cart"] }),
    );
  });

  it("does NOT invalidate cart query when no pending cart ops", async () => {
    mockGetCartOps.mockReturnValue([]);
    renderHook(() => useSyncManager("user-abc"), { wrapper: makeWrapper() });
    await act(() => Promise.resolve());
    // wishlist is also empty, so no invalidation expected
    expect(mockInvalidateQueries).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["cart"] }),
    );
  });
});

describe("useSyncManager — authenticated with pending wishlist ops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockApiPost.mockResolvedValue({});
    mockApiDelete.mockResolvedValue({});
    mockGetCartOps.mockReturnValue([]);
    mockClearCartOps.mockReturnValue(undefined);
    mockClearWishlistOps.mockReturnValue(undefined);
    mockInvalidateQueries.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("replays 'add' wishlist op via POST /api/user/wishlist", async () => {
    mockGetWishlistOps.mockReturnValue([
      { op: "add", itemId: "product-charizard", type: "product" },
    ]);
    renderHook(() => useSyncManager("user-abc"), { wrapper: makeWrapper() });
    await act(() => Promise.resolve());
    expect(mockApiPost).toHaveBeenCalledWith("/api/user/wishlist", {
      productId: "product-charizard",
    });
  });

  it("replays 'remove' wishlist op via DELETE /api/user/wishlist/{itemId}", async () => {
    mockGetWishlistOps.mockReturnValue([
      { op: "remove", itemId: "product-pikachu", type: "product" },
    ]);
    renderHook(() => useSyncManager("user-abc"), { wrapper: makeWrapper() });
    await act(() => Promise.resolve());
    expect(mockApiDelete).toHaveBeenCalledWith("/api/user/wishlist/product-pikachu");
  });

  it("skips wishlist ops where type !== 'product' (server wishlist is product-only)", async () => {
    mockGetWishlistOps.mockReturnValue([
      { op: "add", itemId: "auction-1", type: "auction" },
    ]);
    renderHook(() => useSyncManager("user-abc"), { wrapper: makeWrapper() });
    await act(() => Promise.resolve());
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it("clears wishlist ops after replay", async () => {
    mockGetWishlistOps.mockReturnValue([
      { op: "add", itemId: "product-1", type: "product" },
    ]);
    renderHook(() => useSyncManager("user-abc"), { wrapper: makeWrapper() });
    await act(() => Promise.resolve());
    expect(mockClearWishlistOps).toHaveBeenCalledTimes(1);
  });

  it("invalidates wishlist query with userId when there were pending wishlist ops", async () => {
    mockGetWishlistOps.mockReturnValue([
      { op: "add", itemId: "product-1", type: "product" },
    ]);
    renderHook(() => useSyncManager("user-buyer-1"), { wrapper: makeWrapper() });
    await act(() => Promise.resolve());
    expect(mockInvalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["wishlist", "user-buyer-1"] }),
    );
  });
});

describe("useSyncManager — interval re-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockApiPost.mockResolvedValue({});
    mockGetCartOps.mockReturnValue([{ op: "add", productId: "p1", quantity: 1 }]);
    mockGetWishlistOps.mockReturnValue([]);
    mockClearCartOps.mockReturnValue(undefined);
    mockClearWishlistOps.mockReturnValue(undefined);
    mockInvalidateQueries.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("re-syncs after 30 seconds", async () => {
    renderHook(() => useSyncManager("user-abc"), { wrapper: makeWrapper() });
    await act(() => Promise.resolve());
    const callsAfterMount = mockApiPost.mock.calls.length;

    await act(async () => {
      vi.advanceTimersByTime(SYNC_INTERVAL_MS);
      await Promise.resolve();
    });
    expect(mockApiPost.mock.calls.length).toBeGreaterThan(callsAfterMount);
  });

  it("clears interval on unmount (no sync after unmount)", async () => {
    const { unmount } = renderHook(() => useSyncManager("user-abc"), {
      wrapper: makeWrapper(),
    });
    await act(() => Promise.resolve());
    unmount();
    const callsBeforeAdvance = mockApiPost.mock.calls.length;

    await act(async () => {
      vi.advanceTimersByTime(SYNC_INTERVAL_MS * 3);
      await Promise.resolve();
    });
    // No additional calls after unmount
    expect(mockApiPost.mock.calls.length).toBe(callsBeforeAdvance);
  });
});

describe("useSyncManager — error resilience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGetWishlistOps.mockReturnValue([]);
    mockClearCartOps.mockReturnValue(undefined);
    mockClearWishlistOps.mockReturnValue(undefined);
    mockInvalidateQueries.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("individual cart op failure does not prevent clearCartOps from running", async () => {
    mockGetCartOps.mockReturnValue([
      { op: "add", productId: "product-1", quantity: 1 },
    ]);
    mockApiPost.mockRejectedValue(new Error("Network error"));
    renderHook(() => useSyncManager("user-abc"), { wrapper: makeWrapper() });
    await act(() => Promise.resolve());
    expect(mockClearCartOps).toHaveBeenCalledTimes(1);
  });
});
