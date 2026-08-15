import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSwipe } from "../useSwipe";

interface Point {
  clientX: number;
  clientY: number;
}

function touchEvent(type: string, touches: Point[], changedTouches: Point[] = touches): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    touches: Point[];
    changedTouches: Point[];
  };
  ev.touches = touches;
  ev.changedTouches = changedTouches;
  return ev;
}

function setup(options: Parameters<typeof useSwipe>[1]) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const ref = { current: el };
  renderHook(() => useSwipe(ref, options));
  return el;
}

describe("useSwipe — touchcancel handling (bug #8 regression)", () => {
  it("resets isSwiping state and fires onSwipeEnd when the touch is cancelled mid-gesture", () => {
    const onSwipeEnd = vi.fn();
    const onSwipe = vi.fn();
    const el = setup({ onSwipeEnd, onSwipe });

    el.dispatchEvent(touchEvent("touchstart", [{ clientX: 0, clientY: 0 }]));
    el.dispatchEvent(touchEvent("touchmove", [{ clientX: 60, clientY: 0 }]));

    // Interrupted (e.g. the browser reinterprets the gesture as a page
    // scroll) — before the fix, onSwipeEnd never fires and isSwiping stays
    // stuck true, so a caller driving a "dragging" flag off onSwipeEnd would
    // never clear it.
    el.dispatchEvent(touchEvent("touchcancel", []));
    expect(onSwipeEnd).toHaveBeenCalledTimes(1);
    expect(onSwipe).not.toHaveBeenCalled();

    // A brand new gesture right after must work normally (proves internal
    // state was actually reset, not just onSwipeEnd fired once).
    el.dispatchEvent(touchEvent("touchstart", [{ clientX: 0, clientY: 0 }]));
    el.dispatchEvent(touchEvent("touchend", [], [{ clientX: -80, clientY: 0 }]));
    expect(onSwipe).toHaveBeenCalledTimes(1);
    expect(onSwipe.mock.calls[0][0]).toBe("left");
  });

  it("does not fire onSwipeEnd twice for a cancel with no active gesture", () => {
    const onSwipeEnd = vi.fn();
    const el = setup({ onSwipeEnd });
    el.dispatchEvent(touchEvent("touchcancel", []));
    expect(onSwipeEnd).not.toHaveBeenCalled();
  });
});
