import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGuestCart } from "../useGuestCart";

const CART_KEY = "guest_cart";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("useGuestCart — initial state", () => {
  it("starts with empty items when localStorage is empty", async () => {
    const { result } = renderHook(() => useGuestCart());
    await act(async () => {});
    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it("initializes from existing localStorage data", async () => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([{ productId: "product-abc", quantity: 2 }]),
    );
    const { result } = renderHook(() => useGuestCart());
    await act(async () => {});
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe("product-abc");
  });

  it("falls back to empty when localStorage has corrupted data", async () => {
    localStorage.setItem(CART_KEY, "not-valid-json{{{{");
    const { result } = renderHook(() => useGuestCart());
    await act(async () => {});
    expect(result.current.items).toEqual([]);
  });
});

describe("useGuestCart — add", () => {
  it("add(item) appears in items", async () => {
    const { result } = renderHook(() => useGuestCart());
    await act(async () => {});
    act(() => result.current.add("product-abc", 1, { productTitle: "Charizard PSA 9" }));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe("product-abc");
    expect(result.current.items[0].quantity).toBe(1);
  });

  it("add same productId merges quantity", async () => {
    const { result } = renderHook(() => useGuestCart());
    await act(async () => {});
    act(() => result.current.add("product-abc", 1));
    act(() => result.current.add("product-abc", 2));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
  });

  it("count reflects total quantity across all items", async () => {
    const { result } = renderHook(() => useGuestCart());
    await act(async () => {});
    act(() => result.current.add("product-abc", 2));
    act(() => result.current.add("product-xyz", 3));
    expect(result.current.count).toBe(5);
  });

  it("writes to localStorage", async () => {
    const { result } = renderHook(() => useGuestCart());
    await act(async () => {});
    act(() => result.current.add("product-abc", 1));
    const stored = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].productId).toBe("product-abc");
  });
});

describe("useGuestCart — remove", () => {
  it("removes item from cart", async () => {
    const { result } = renderHook(() => useGuestCart());
    await act(async () => {});
    act(() => result.current.add("product-abc", 1));
    act(() => result.current.add("product-xyz", 2));
    act(() => result.current.remove("product-abc"));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe("product-xyz");
  });

  it("count reflects removal", async () => {
    const { result } = renderHook(() => useGuestCart());
    await act(async () => {});
    act(() => result.current.add("product-abc", 3));
    act(() => result.current.remove("product-abc"));
    expect(result.current.count).toBe(0);
  });
});

describe("useGuestCart — updateQuantity", () => {
  it("updates quantity for existing item", async () => {
    const { result } = renderHook(() => useGuestCart());
    await act(async () => {});
    act(() => result.current.add("product-abc", 1));
    act(() => result.current.updateQuantity("product-abc", 5));
    expect(result.current.items[0].quantity).toBe(5);
  });

  it("removes item when quantity set to 0", async () => {
    const { result } = renderHook(() => useGuestCart());
    await act(async () => {});
    act(() => result.current.add("product-abc", 2));
    act(() => result.current.updateQuantity("product-abc", 0));
    expect(result.current.items).toHaveLength(0);
  });
});

describe("useGuestCart — clear", () => {
  it("clears all items", async () => {
    const { result } = renderHook(() => useGuestCart());
    await act(async () => {});
    act(() => result.current.add("product-abc", 1));
    act(() => result.current.add("product-xyz", 2));
    act(() => result.current.clear());
    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it("clears localStorage", async () => {
    const { result } = renderHook(() => useGuestCart());
    await act(async () => {});
    act(() => result.current.add("product-abc", 1));
    act(() => result.current.clear());
    expect(localStorage.getItem(CART_KEY)).toBeNull();
  });
});
