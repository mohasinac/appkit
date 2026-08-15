import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRealtimeEvent, RealtimeEventType, RealtimeEventStatus } from "../useRealtimeEvent";
import type { IClientRealtimeProvider } from "../../../contracts/client-realtime";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useRealtimeEvent — stale configRef (bug #5 regression)", () => {
  it("uses the latest onLogError callback captured on a later render, not the one from first render", async () => {
    const provider: IClientRealtimeProvider = {
      signInWithToken: vi.fn().mockRejectedValue(new Error("boom")),
      signOut: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
    };
    const onLogErrorV1 = vi.fn();
    const onLogErrorV2 = vi.fn();

    const { result, rerender } = renderHook(
      ({ onLogError }) =>
        useRealtimeEvent({ type: RealtimeEventType.BID, rtdbPath: "bids", realtimeProvider: provider, onLogError }),
      { initialProps: { onLogError: onLogErrorV1 } },
    );

    // Simulate a real consumer that builds a fresh config object every
    // render (e.g. useBulkEvent) — re-render with a new onLogError before
    // subscribe() is ever called.
    rerender({ onLogError: onLogErrorV2 });

    await act(async () => {
      result.current.subscribe("event-1", "token-1");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onLogErrorV2).toHaveBeenCalled();
    expect(onLogErrorV1).not.toHaveBeenCalled();
  });
});

describe("useRealtimeEvent — async subscribe race conditions (bug #6 regression)", () => {
  it("a stale sign-in failure for an abandoned eventId does not tear down a newer eventId's live subscription", async () => {
    const signInDeferredA = deferred<void>();
    const unsubscribeSpy = vi.fn();
    let callCount = 0;

    const provider: IClientRealtimeProvider = {
      signInWithToken: vi.fn(() => {
        callCount++;
        // Call 1 == subscribe("event-A", ...) — stays pending until rejected below.
        // Call 2 == subscribe("event-B", ...) — resolves immediately (fast).
        return callCount === 1 ? signInDeferredA.promise : Promise.resolve();
      }),
      signOut: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(() => unsubscribeSpy),
    };

    const { result } = renderHook(() =>
      useRealtimeEvent({ type: RealtimeEventType.BID, rtdbPath: "bids", realtimeProvider: provider }),
    );

    act(() => {
      result.current.subscribe("event-A", "token-A");
    });

    await act(async () => {
      result.current.subscribe("event-B", "token-B");
      await Promise.resolve();
      await Promise.resolve();
    });

    // B's sign-in resolved fast and fully subscribed while A is still pending.
    expect(result.current.status).toBe(RealtimeEventStatus.PENDING);
    expect(provider.subscribe).toHaveBeenCalledTimes(1);

    // A's stale sign-in finally rejects — must not affect B's live subscription.
    await act(async () => {
      signInDeferredA.reject(new Error("token expired"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(unsubscribeSpy).not.toHaveBeenCalled();
    expect(result.current.status).toBe(RealtimeEventStatus.PENDING);
    expect(result.current.error).toBeNull();
  });
});
