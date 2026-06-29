import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockShowToast = vi.fn();
vi.mock("../../../../ui", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

import { useWishlistToggle } from "../useWishlistToggle";

function makeActions(override?: Partial<{ addToWishlist: () => Promise<unknown>; removeFromWishlist: () => Promise<unknown> }>) {
  return {
    addToWishlist: vi.fn().mockResolvedValue(undefined),
    removeFromWishlist: vi.fn().mockResolvedValue(undefined),
    ...override,
  };
}

describe("useWishlistToggle — initial state", () => {
  it("starts with inWishlist=false by default", () => {
    const { result } = renderHook(() =>
      useWishlistToggle("product-abc", false, makeActions()),
    );
    expect(result.current.inWishlist).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("starts with inWishlist=true when initial=true", () => {
    const { result } = renderHook(() =>
      useWishlistToggle("product-abc", true, makeActions()),
    );
    expect(result.current.inWishlist).toBe(true);
  });
});

describe("useWishlistToggle — add flow", () => {
  it("calls addToWishlist and shows success toast", async () => {
    const actions = makeActions();
    const { result } = renderHook(() =>
      useWishlistToggle("product-abc", false, actions),
    );
    await act(async () => { await result.current.toggle(); });
    expect(actions.addToWishlist).toHaveBeenCalledWith("product-abc");
    expect(mockShowToast).toHaveBeenCalledWith("Added to wishlist.", "success");
    expect(result.current.inWishlist).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useWishlistToggle — remove flow", () => {
  it("calls removeFromWishlist and shows success toast", async () => {
    const actions = makeActions();
    const { result } = renderHook(() =>
      useWishlistToggle("product-abc", true, actions),
    );
    await act(async () => { await result.current.toggle(); });
    expect(actions.removeFromWishlist).toHaveBeenCalledWith("product-abc");
    expect(mockShowToast).toHaveBeenCalledWith("Removed from wishlist.", "success");
    expect(result.current.inWishlist).toBe(false);
  });
});

describe("useWishlistToggle — error handling", () => {
  it("reverts optimistic state on failure", async () => {
    const actions = makeActions({
      addToWishlist: vi.fn().mockRejectedValue(new Error("Network error")),
    });
    const { result } = renderHook(() =>
      useWishlistToggle("product-abc", false, actions),
    );
    await act(async () => {
      try { await result.current.toggle(); } catch {}
    });
    expect(result.current.inWishlist).toBe(false);
    expect(mockShowToast).toHaveBeenCalledWith("Network error", "error");
  });

  it("shows error toast when no actions provided", async () => {
    const { result } = renderHook(() =>
      useWishlistToggle("product-abc", false, undefined),
    );
    await act(async () => {
      try { await result.current.toggle(); } catch {}
    });
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining("handlers"), "error");
  });

  it("isLoading resets to false after error", async () => {
    const actions = makeActions({
      addToWishlist: vi.fn().mockRejectedValue(new Error("fail")),
    });
    const { result } = renderHook(() =>
      useWishlistToggle("product-abc", false, actions),
    );
    await act(async () => {
      try { await result.current.toggle(); } catch {}
    });
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useWishlistToggle — no-op when productId empty", () => {
  it("does nothing when productId is empty string", async () => {
    const actions = makeActions();
    const { result } = renderHook(() =>
      useWishlistToggle("", false, actions),
    );
    await act(async () => { await result.current.toggle(); });
    expect(actions.addToWishlist).not.toHaveBeenCalled();
    expect(result.current.inWishlist).toBe(false);
  });
});
