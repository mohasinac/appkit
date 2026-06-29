import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockShowToast = vi.fn();

vi.mock("../../../ui", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

import { useMessage } from "../useMessage";

describe("useMessage — initial state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with null message", () => {
    const { result } = renderHook(() => useMessage());
    expect(result.current.message).toBeNull();
  });
});

describe("useMessage — showSuccess", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets message with type=success and calls showToast", () => {
    const { result } = renderHook(() => useMessage());
    act(() => result.current.showSuccess("Done!"));
    expect(result.current.message).toEqual({ type: "success", text: "Done!" });
    expect(mockShowToast).toHaveBeenCalledWith("Done!", "success");
  });

  it("clears message after 5 seconds", () => {
    const { result } = renderHook(() => useMessage());
    act(() => result.current.showSuccess("Done!"));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.message).toBeNull();
  });

  it("calling showSuccess again resets the 5-second timer", () => {
    const { result } = renderHook(() => useMessage());
    act(() => result.current.showSuccess("First"));
    act(() => { vi.advanceTimersByTime(3000); });
    act(() => result.current.showSuccess("Second"));
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.message).toEqual({ type: "success", text: "Second" });
    act(() => { vi.advanceTimersByTime(2100); });
    expect(result.current.message).toBeNull();
  });
});

describe("useMessage — showError", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets message with type=error and calls showToast", () => {
    const { result } = renderHook(() => useMessage());
    act(() => result.current.showError("Failed!"));
    expect(result.current.message).toEqual({ type: "error", text: "Failed!" });
    expect(mockShowToast).toHaveBeenCalledWith("Failed!", "error");
  });
});

describe("useMessage — clearMessage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("immediately clears the message", () => {
    const { result } = renderHook(() => useMessage());
    act(() => result.current.showSuccess("Hello"));
    act(() => result.current.clearMessage());
    expect(result.current.message).toBeNull();
  });

  it("cancels the auto-clear timer when clearMessage is called", () => {
    const { result } = renderHook(() => useMessage());
    act(() => result.current.showSuccess("Hello"));
    act(() => result.current.clearMessage());
    act(() => { vi.advanceTimersByTime(6000); });
    expect(result.current.message).toBeNull();
  });
});
