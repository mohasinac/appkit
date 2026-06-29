import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBulkAction } from "../useBulkAction";
import type { BulkActionPayload, BulkActionResult } from "../useBulkAction";

function makeResult(overrides: Partial<BulkActionResult> = {}): BulkActionResult {
  return {
    action: "delete",
    summary: { total: 2, succeeded: 2, skipped: 0, failed: 0 },
    succeeded: ["id-1", "id-2"],
    skipped: [],
    failed: [],
    ...overrides,
  };
}

describe("useBulkAction — execute without confirm", () => {
  it("calls mutationFn and stores result", async () => {
    const mutationFn = vi.fn().mockResolvedValue(makeResult());
    const { result } = renderHook(() => useBulkAction({ mutationFn }));

    await act(async () => {
      await result.current.execute({ action: "delete", ids: ["id-1", "id-2"] });
    });

    expect(mutationFn).toHaveBeenCalledWith({ action: "delete", ids: ["id-1", "id-2"] });
    expect(result.current.result?.summary.succeeded).toBe(2);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("calls onSuccess callback with result and payload", async () => {
    const onSuccess = vi.fn();
    const mutationFn = vi.fn().mockResolvedValue(makeResult());
    const { result } = renderHook(() => useBulkAction({ mutationFn, onSuccess }));

    await act(async () => {
      await result.current.execute({ action: "delete", ids: ["id-1"] });
    });

    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ action: "delete" }),
      { action: "delete", ids: ["id-1"] },
    );
  });

  it("sets error and calls onError on rejection", async () => {
    const onError = vi.fn();
    const mutationFn = vi.fn().mockRejectedValue(new Error("Server error"));
    const { result } = renderHook(() => useBulkAction({ mutationFn, onError }));

    await act(async () => {
      await result.current.execute({ action: "delete", ids: ["id-1"] });
    });

    expect(result.current.error?.message).toBe("Server error");
    expect(result.current.result).toBeNull();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
  });

  it("isLoading is false after execution completes", async () => {
    const mutationFn = vi.fn().mockResolvedValue(makeResult());
    const { result } = renderHook(() => useBulkAction({ mutationFn }));

    await act(async () => {
      await result.current.execute({ action: "delete", ids: [] });
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useBulkAction — requiresConfirm flow", () => {
  it("parks payload in pendingPayload instead of executing", async () => {
    const mutationFn = vi.fn().mockResolvedValue(makeResult());
    const { result } = renderHook(() =>
      useBulkAction({ mutationFn, requiresConfirm: true }),
    );

    await act(async () => {
      await result.current.execute({ action: "delete", ids: ["id-1"] });
    });

    expect(mutationFn).not.toHaveBeenCalled();
    expect(result.current.pendingPayload).toEqual({ action: "delete", ids: ["id-1"] });
  });

  it("confirmAndExecute runs the mutation and clears pendingPayload", async () => {
    const mutationFn = vi.fn().mockResolvedValue(makeResult());
    const { result } = renderHook(() =>
      useBulkAction({ mutationFn, requiresConfirm: true }),
    );

    await act(async () => {
      await result.current.execute({ action: "delete", ids: ["id-1"] });
    });
    await act(async () => {
      await result.current.confirmAndExecute();
    });

    expect(mutationFn).toHaveBeenCalledTimes(1);
    expect(result.current.pendingPayload).toBeNull();
  });

  it("cancelConfirm clears pendingPayload without executing", async () => {
    const mutationFn = vi.fn().mockResolvedValue(makeResult());
    const { result } = renderHook(() =>
      useBulkAction({ mutationFn, requiresConfirm: true }),
    );

    await act(async () => {
      await result.current.execute({ action: "delete", ids: ["id-1"] });
    });
    act(() => result.current.cancelConfirm());

    expect(mutationFn).not.toHaveBeenCalled();
    expect(result.current.pendingPayload).toBeNull();
  });

  it("confirmAndExecute is a no-op when pendingPayload is null", async () => {
    const mutationFn = vi.fn();
    const { result } = renderHook(() => useBulkAction({ mutationFn }));

    await act(async () => {
      await result.current.confirmAndExecute();
    });

    expect(mutationFn).not.toHaveBeenCalled();
  });
});

describe("useBulkAction — reset", () => {
  it("clears result, error, and pendingPayload", async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useBulkAction({ mutationFn }));

    await act(async () => {
      await result.current.execute({ action: "delete", ids: [] });
    });
    expect(result.current.error).not.toBeNull();

    act(() => result.current.reset());

    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.pendingPayload).toBeNull();
  });
});
