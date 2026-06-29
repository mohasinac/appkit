import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockShowToast = vi.fn();
vi.mock("../../../../ui", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

import { useHistory } from "../useHistory";

const HISTORY_KEY = "guest_history";

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  mockShowToast.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe("useHistory — guest (unauthenticated)", () => {
  it("starts with empty items", async () => {
    const { result } = renderHook(() => useHistory(null));
    await act(async () => {
      vi.runAllTimers();
    });
    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.isGuest).toBe(true);
  });

  it("reads existing localStorage items on mount", async () => {
    const existing = [
      { productId: "product-charizard", productType: "product", viewedAt: new Date().toISOString() },
    ];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing));
    const { result } = renderHook(() => useHistory(null));
    await act(async () => {
      vi.runAllTimers();
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe("product-charizard");
  });
});

describe("useHistory — guest track (debounced)", () => {
  it("track() fires after debounce delay and adds item to localStorage", async () => {
    const uniqueId = `product-unique-${Date.now()}-tracktest`;
    const { result } = renderHook(() => useHistory(null));
    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.track({ productId: uniqueId, productType: "product" });
    });
    expect(result.current.count).toBe(0);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    expect(stored.some((i: { productId: string }) => i.productId === uniqueId)).toBe(true);
    expect(result.current.count).toBeGreaterThan(0);
  });

  it("tracking same item twice in debounce window only fires once", async () => {
    const uniqueId = `product-unique-${Date.now()}-dedup`;
    const { result } = renderHook(() => useHistory(null));
    await act(async () => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.track({ productId: uniqueId, productType: "product" });
      result.current.track({ productId: uniqueId, productType: "product" });
    });
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    const matches = stored.filter((i: { productId: string }) => i.productId === uniqueId);
    expect(matches).toHaveLength(1);
  });
});

describe("useHistory — guest remove", () => {
  it("remove(productId) removes item from list", async () => {
    const existing = [
      { productId: "product-remove-me", productType: "product", viewedAt: new Date().toISOString() },
      { productId: "product-keep-me", productType: "product", viewedAt: new Date().toISOString() },
    ];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing));
    const { result } = renderHook(() => useHistory(null));
    await act(async () => {
      vi.runAllTimers();
    });

    await act(async () => {
      await result.current.remove("product-remove-me");
    });

    expect(result.current.items.find((i) => i.productId === "product-remove-me")).toBeUndefined();
    expect(result.current.items.find((i) => i.productId === "product-keep-me")).toBeDefined();
  });
});

describe("useHistory — guest clear", () => {
  it("clear() empties items and shows success toast", async () => {
    const existing = [
      { productId: "product-abc", productType: "product", viewedAt: new Date().toISOString() },
    ];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing));
    const { result } = renderHook(() => useHistory(null));
    await act(async () => {
      vi.runAllTimers();
    });

    await act(async () => {
      await result.current.clear();
    });

    expect(result.current.items).toHaveLength(0);
    expect(mockShowToast).toHaveBeenCalledWith("History cleared.", "success");
  });
});
