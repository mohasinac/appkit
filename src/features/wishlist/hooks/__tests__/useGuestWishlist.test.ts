import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGuestWishlist } from "../useGuestWishlist";

const WL_KEY = "guest_wishlist";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("useGuestWishlist — initial state", () => {
  it("starts empty when localStorage is empty", async () => {
    const { result } = renderHook(() => useGuestWishlist());
    await act(async () => {});
    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.isInitialized).toBe(true);
  });

  it("reads from localStorage on mount", async () => {
    localStorage.setItem(
      WL_KEY,
      JSON.stringify([{ itemId: "product-abc", type: "product", addedAt: new Date().toISOString() }]),
    );
    const { result } = renderHook(() => useGuestWishlist());
    await act(async () => {});
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].itemId).toBe("product-abc");
  });

  it("falls back to empty on corrupted localStorage", async () => {
    localStorage.setItem(WL_KEY, "{{not-json}}");
    const { result } = renderHook(() => useGuestWishlist());
    await act(async () => {});
    expect(result.current.items).toEqual([]);
  });
});

describe("useGuestWishlist — add", () => {
  it("add(item) → isInWishlist returns true", async () => {
    const { result } = renderHook(() => useGuestWishlist());
    await act(async () => {});
    act(() => result.current.add("product-abc", "product"));
    expect(result.current.isInWishlist("product-abc", "product")).toBe(true);
    expect(result.current.count).toBe(1);
  });

  it("add same productId + type → no duplicate", async () => {
    const { result } = renderHook(() => useGuestWishlist());
    await act(async () => {});
    act(() => result.current.add("product-abc", "product"));
    act(() => result.current.add("product-abc", "product"));
    expect(result.current.count).toBe(1);
  });

  it("same productId but different type → two entries", async () => {
    const { result } = renderHook(() => useGuestWishlist());
    await act(async () => {});
    act(() => result.current.add("product-abc", "product"));
    act(() => result.current.add("product-abc", "auction"));
    expect(result.current.count).toBe(2);
  });

  it("writes to localStorage", async () => {
    const { result } = renderHook(() => useGuestWishlist());
    await act(async () => {});
    act(() => result.current.add("product-abc", "product", { title: "Charizard" }));
    const stored = JSON.parse(localStorage.getItem(WL_KEY) ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].itemId).toBe("product-abc");
  });
});

describe("useGuestWishlist — remove", () => {
  it("remove → isInWishlist returns false", async () => {
    const { result } = renderHook(() => useGuestWishlist());
    await act(async () => {});
    act(() => result.current.add("product-abc", "product"));
    act(() => result.current.remove("product-abc", "product"));
    expect(result.current.isInWishlist("product-abc", "product")).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it("removing by type only removes matching type", async () => {
    const { result } = renderHook(() => useGuestWishlist());
    await act(async () => {});
    act(() => result.current.add("product-abc", "product"));
    act(() => result.current.add("product-abc", "auction"));
    act(() => result.current.remove("product-abc", "product"));
    expect(result.current.isInWishlist("product-abc", "auction")).toBe(true);
    expect(result.current.count).toBe(1);
  });
});

describe("useGuestWishlist — getByType", () => {
  it("returns only items matching the given type", async () => {
    const { result } = renderHook(() => useGuestWishlist());
    await act(async () => {});
    act(() => result.current.add("product-abc", "product"));
    act(() => result.current.add("auction-xyz", "auction"));
    const products = result.current.getByType("product");
    expect(products).toHaveLength(1);
    expect(products[0].itemId).toBe("product-abc");
  });
});

describe("useGuestWishlist — countByType", () => {
  it("countByType returns items of that type only", async () => {
    const { result } = renderHook(() => useGuestWishlist());
    await act(async () => {});
    act(() => result.current.add("product-1", "product"));
    act(() => result.current.add("product-2", "product"));
    act(() => result.current.add("auction-1", "auction"));
    expect(result.current.countByType("product")).toBe(2);
    expect(result.current.countByType("auction")).toBe(1);
  });
});
