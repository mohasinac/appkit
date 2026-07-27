import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks ---

const mockShowToast = vi.fn();
const mockUpdateToast = vi.fn();
const mockSurfaceError = vi.fn();

vi.mock("../../ui/components/Toast", () => ({
  useToast: () => ({
    showToast: mockShowToast,
    updateToast: mockUpdateToast,
  }),
}));

vi.mock("./surface-error", () => ({
  surfaceError: mockSurfaceError,
  ApiError: class ApiError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = "ApiError";
    }
  },
  isApiError: (e: unknown) => e instanceof Error && (e as { name?: string }).name === "ApiError",
}));

import { useApiMutation } from "../useApiMutation";

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useApiMutation — basic success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls mutationFn and resolves data on success", async () => {
    const mutationFn = vi.fn().mockResolvedValue({ result: "ok" });
    const { result } = renderHook(
      () => useApiMutation({ mutationFn }),
      { wrapper: makeWrapper() },
    );
    let data: unknown;
    await act(async () => { data = await result.current.mutateAsync(undefined); });
    expect(mutationFn).toHaveBeenCalledTimes(1);
    expect(data).toEqual({ result: "ok" });
  });

  it("fires caller onSuccess callback after successful mutation", async () => {
    const mutationFn = vi.fn().mockResolvedValue("value");
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useApiMutation({ mutationFn, onSuccess }),
      { wrapper: makeWrapper() },
    );
    await act(async () => { await result.current.mutateAsync(undefined); });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("does NOT show success toast when successMessage is not set", async () => {
    const mutationFn = vi.fn().mockResolvedValue("ok");
    const { result } = renderHook(
      () => useApiMutation({ mutationFn }),
      { wrapper: makeWrapper() },
    );
    await act(async () => { await result.current.mutateAsync(undefined); });
    expect(mockShowToast).not.toHaveBeenCalledWith(expect.any(String), "success");
  });

  it("shows success toast when successMessage is provided (no loading toast)", async () => {
    const mutationFn = vi.fn().mockResolvedValue("ok");
    const { result } = renderHook(
      () => useApiMutation({ mutationFn, successMessage: "Saved!" }),
      { wrapper: makeWrapper() },
    );
    await act(async () => { await result.current.mutateAsync(undefined); });
    expect(mockShowToast).toHaveBeenCalledWith("Saved!", "success");
  });
});

describe("useApiMutation — loading toast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShowToast.mockReturnValue("toast-id-123");
  });

  it("shows loading toast on mutate when loadingMessage is set", async () => {
    const mutationFn = vi.fn().mockResolvedValue("ok");
    const { result } = renderHook(
      () => useApiMutation({ mutationFn, loadingMessage: "Saving..." }),
      { wrapper: makeWrapper() },
    );
    await act(async () => { await result.current.mutateAsync(undefined); });
    expect(mockShowToast).toHaveBeenCalledWith("Saving...", "loading", 0);
  });

  it("updates loading toast to success variant when successMessage provided", async () => {
    const mutationFn = vi.fn().mockResolvedValue("ok");
    const { result } = renderHook(
      () => useApiMutation({
        mutationFn,
        loadingMessage: "Processing...",
        successMessage: "Done!",
      }),
      { wrapper: makeWrapper() },
    );
    await act(async () => { await result.current.mutateAsync(undefined); });
    // Loading toast shown, then updated to success
    expect(mockShowToast).toHaveBeenCalledWith("Processing...", "loading", 0);
    expect(mockUpdateToast).toHaveBeenCalledWith("toast-id-123", "success", "Done!");
    // No separate success showToast call (uses updateToast instead)
    expect(mockShowToast).not.toHaveBeenCalledWith("Done!", "success");
  });

  it("updates loading toast to 'Done' when no successMessage", async () => {
    const mutationFn = vi.fn().mockResolvedValue("ok");
    const { result } = renderHook(
      () => useApiMutation({ mutationFn, loadingMessage: "Working..." }),
      { wrapper: makeWrapper() },
    );
    await act(async () => { await result.current.mutateAsync(undefined); });
    expect(mockUpdateToast).toHaveBeenCalledWith("toast-id-123", "success", "Done");
  });

  it("updates loading toast to error variant when mutation fails", async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error("Failed!"));
    const { result } = renderHook(
      () => useApiMutation({ mutationFn, loadingMessage: "Processing..." }),
      { wrapper: makeWrapper() },
    );
    await act(async () => {
      try { await result.current.mutateAsync(undefined); } catch {}
    });
    expect(mockUpdateToast).toHaveBeenCalledWith("toast-id-123", "error", "Failed!");
  });

  it("does NOT show loading toast when loadingMessage is not set", async () => {
    const mutationFn = vi.fn().mockResolvedValue("ok");
    const { result } = renderHook(
      () => useApiMutation({ mutationFn }),
      { wrapper: makeWrapper() },
    );
    await act(async () => { await result.current.mutateAsync(undefined); });
    expect(mockShowToast).not.toHaveBeenCalledWith(expect.anything(), "loading", 0);
  });
});

describe("useApiMutation — error surfacing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls surfaceError on mutation failure", async () => {
    const error = new Error("Something went wrong");
    const mutationFn = vi.fn().mockRejectedValue(error);
    const { result } = renderHook(
      () => useApiMutation({ mutationFn }),
      { wrapper: makeWrapper() },
    );
    await act(async () => {
      try { await result.current.mutateAsync(undefined); } catch {}
    });
    expect(mockSurfaceError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ showToast: mockShowToast }),
    );
  });

  it("fires caller onError callback AFTER surfaceError", async () => {
    const callOrder: string[] = [];
    mockSurfaceError.mockImplementation(() => { callOrder.push("surfaceError"); });
    const onError = vi.fn().mockImplementation(() => { callOrder.push("onError"); });
    const mutationFn = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(
      () => useApiMutation({ mutationFn, onError }),
      { wrapper: makeWrapper() },
    );
    await act(async () => {
      try { await result.current.mutateAsync(undefined); } catch {}
    });
    expect(callOrder).toEqual(["surfaceError", "onError"]);
  });

  it("passes setFieldError to surfaceError when provided", async () => {
    const setFieldError = vi.fn();
    const mutationFn = vi.fn().mockRejectedValue(new Error("validation error"));
    const { result } = renderHook(
      () => useApiMutation({ mutationFn, setFieldError }),
      { wrapper: makeWrapper() },
    );
    await act(async () => {
      try { await result.current.mutateAsync(undefined); } catch {}
    });
    expect(mockSurfaceError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ setFieldError }),
    );
  });

  it("passes translate fn to surfaceError when provided", async () => {
    const translate = vi.fn((k: string) => k);
    const mutationFn = vi.fn().mockRejectedValue(new Error("err"));
    const { result } = renderHook(
      () => useApiMutation({ mutationFn, translate }),
      { wrapper: makeWrapper() },
    );
    await act(async () => {
      try { await result.current.mutateAsync(undefined); } catch {}
    });
    expect(mockSurfaceError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ translate }),
    );
  });

  it("passes reportClientError to surfaceError as report prop", async () => {
    const reportClientError = vi.fn();
    const mutationFn = vi.fn().mockRejectedValue(new Error("oops"));
    const { result } = renderHook(
      () => useApiMutation({ mutationFn, reportClientError }),
      { wrapper: makeWrapper() },
    );
    await act(async () => {
      try { await result.current.mutateAsync(undefined); } catch {}
    });
    expect(mockSurfaceError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ report: reportClientError }),
    );
  });
});

describe("useApiMutation — caller callbacks forwarded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fires caller onSettled on success", async () => {
    const onSettled = vi.fn();
    const mutationFn = vi.fn().mockResolvedValue("ok");
    const { result } = renderHook(
      () => useApiMutation({ mutationFn, onSettled }),
      { wrapper: makeWrapper() },
    );
    await act(async () => { await result.current.mutateAsync(undefined); });
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("fires caller onSettled on error", async () => {
    const onSettled = vi.fn();
    const mutationFn = vi.fn().mockRejectedValue(new Error("err"));
    const { result } = renderHook(
      () => useApiMutation({ mutationFn, onSettled }),
      { wrapper: makeWrapper() },
    );
    await act(async () => {
      try { await result.current.mutateAsync(undefined); } catch {}
    });
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("caller onMutate is called before mutationFn", async () => {
    const callOrder: string[] = [];
    const onMutate = vi.fn().mockImplementation(() => {
      callOrder.push("onMutate");
      return undefined;
    });
    const mutationFn = vi.fn().mockImplementation(async () => {
      callOrder.push("mutationFn");
      return "ok";
    });
    const { result } = renderHook(
      () => useApiMutation({ mutationFn, onMutate }),
      { wrapper: makeWrapper() },
    );
    await act(async () => { await result.current.mutateAsync(undefined); });
    // onMutate runs as part of the mutation setup before mutationFn
    expect(callOrder[0]).toBe("onMutate");
  });
});

describe("useApiMutation — pass-through to useMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes isPending / isSuccess / isError from useMutation", async () => {
    let resolveFn: (v: string) => void;
    const mutationFn = vi.fn().mockImplementation(
      () => new Promise<string>((res) => { resolveFn = res; }),
    );
    const { result } = renderHook(
      () => useApiMutation({ mutationFn }),
      { wrapper: makeWrapper() },
    );

    expect(result.current.isPending).toBe(false);

    act(() => { result.current.mutate(undefined); });
    expect(result.current.isPending).toBe(true);

    await act(async () => { resolveFn!("done"); await Promise.resolve(); });
    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(true);
  });
});
