import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLongPress } from "../useLongPress";

describe("useLongPress — touchcancel handling (bug #9 regression)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not fire the callback if the touch is cancelled before the threshold", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useLongPress(callback, 500));

    result.current.onTouchStart();
    // Browser reinterprets this touch as a scroll — fires touchcancel, not
    // touchend. Before the fix there was no onTouchCancel handler, so the
    // pending timer survived and fired the callback anyway.
    result.current.onTouchCancel();

    vi.advanceTimersByTime(600);
    expect(callback).not.toHaveBeenCalled();
  });

  it("still fires the callback for a genuine long press with no cancellation", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useLongPress(callback, 500));

    result.current.onTouchStart();
    vi.advanceTimersByTime(600);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
