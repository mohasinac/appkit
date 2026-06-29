import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCountdown } from "../useCountdown";

describe("useCountdown — null / ended cases", () => {
  it("returns null when endDate is undefined", () => {
    const { result } = renderHook(() => useCountdown(undefined));
    expect(result.current).toBeNull();
  });

  it("returns null when endDate is in the past", () => {
    const past = new Date(Date.now() - 10000).toISOString();
    const { result } = renderHook(() => useCountdown(past));
    expect(result.current).toBeNull();
  });

  it("returns null for an invalid date string", () => {
    const { result } = renderHook(() => useCountdown("not-a-date"));
    expect(result.current).toBeNull();
  });
});

describe("useCountdown — active countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns remaining days/hours/minutes/seconds for a future date", () => {
    const futureMs = Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000 + 4 * 60 * 1000 + 5 * 1000;
    const future = new Date(futureMs).toISOString();
    const { result } = renderHook(() => useCountdown(future));
    expect(result.current).not.toBeNull();
    expect(result.current!.days).toBe(2);
    expect(result.current!.hours).toBe(3);
    expect(result.current!.minutes).toBe(4);
    expect(result.current!.seconds).toBe(5);
  });

  it("ticks down each second", () => {
    const future = new Date(Date.now() + 5000).toISOString();
    const { result } = renderHook(() => useCountdown(future));
    expect(result.current!.seconds).toBeGreaterThanOrEqual(4);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current!.seconds).toBeLessThan(5);
  });

  it("returns null after countdown reaches zero", () => {
    const future = new Date(Date.now() + 2000).toISOString();
    const { result } = renderHook(() => useCountdown(future));
    expect(result.current).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toBeNull();
  });

  it("accepts a Date object", () => {
    const future = new Date(Date.now() + 60000);
    const { result } = renderHook(() => useCountdown(future));
    expect(result.current).not.toBeNull();
    expect(result.current!.minutes).toBeGreaterThanOrEqual(0);
  });
});
