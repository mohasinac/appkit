import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWishlistCount, useWishlistCountWithLimit, WISHLIST_CAP_EVENT } from "../useWishlistCount";

vi.mock("next/navigation", () => ({
  usePathname: () => "/home",
}));

vi.mock("../../../http", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("../utils/guest-wishlist", async () => {
  return {
    getGuestWishlistItems: vi.fn().mockReturnValue([]),
    clearGuestWishlist: vi.fn(),
    getGuestWishlistCount: vi.fn().mockReturnValue(0),
    addToGuestWishlist: vi.fn(),
    removeFromGuestWishlist: vi.fn(),
    isInGuestWishlist: vi.fn().mockReturnValue(false),
    getGuestWishlistByType: vi.fn().mockReturnValue([]),
  };
});

const WL_KEY = "guest_wishlist";

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("useWishlistCount — unauthenticated (guest)", () => {
  it("returns guest wishlist count from localStorage", async () => {
    localStorage.setItem(
      WL_KEY,
      JSON.stringify([
        { itemId: "product-abc", type: "product", addedAt: new Date().toISOString() },
        { itemId: "product-xyz", type: "product", addedAt: new Date().toISOString() },
      ]),
    );
    const { result } = renderHook(() => useWishlistCount(null), {
      wrapper: makeWrapper(),
    });
    await act(async () => {});
    expect(result.current).toBe(2);
  });

  it("returns 0 when guest wishlist is empty", async () => {
    const { result } = renderHook(() => useWishlistCount(null), {
      wrapper: makeWrapper(),
    });
    await act(async () => {});
    expect(result.current).toBe(0);
  });
});

describe("useWishlistCountWithLimit", () => {
  it("returns count, limit, isFull, isNearLimit", async () => {
    const { result } = renderHook(() => useWishlistCountWithLimit(null), {
      wrapper: makeWrapper(),
    });
    await act(async () => {});
    expect(typeof result.current.count).toBe("number");
    expect(typeof result.current.limit).toBe("number");
    expect(typeof result.current.isFull).toBe("boolean");
    expect(typeof result.current.isNearLimit).toBe("boolean");
  });

  it("isFull = false when count is 0", async () => {
    const { result } = renderHook(() => useWishlistCountWithLimit(null), {
      wrapper: makeWrapper(),
    });
    await act(async () => {});
    expect(result.current.isFull).toBe(false);
  });
});
