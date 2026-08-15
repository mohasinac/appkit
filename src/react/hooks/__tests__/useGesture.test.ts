import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGesture } from "../useGesture";

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

function setup(options: Parameters<typeof useGesture>[1]) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const ref = { current: el };
  renderHook(() => useGesture(ref, options));
  return el;
}

describe("useGesture — pinch/rotate end-of-gesture math (bug #7 regression)", () => {
  it("reports the true final pinch distance when the final touchend's changedTouches has only one entry", () => {
    const onPinch = vi.fn();
    const el = setup({ onPinch });

    // Two fingers down 100px apart.
    el.dispatchEvent(touchEvent("touchstart", [{ clientX: 0, clientY: 0 }, { clientX: 100, clientY: 0 }]));
    // Fingers spread to 150px apart — captures the last-known two-touch positions.
    el.dispatchEvent(touchEvent("touchmove", [{ clientX: 0, clientY: 0 }, { clientX: 150, clientY: 0 }]));

    // Final touchend: no touches remain, but (as on real devices) only ONE
    // touch is present in changedTouches. Before the fix, `changedTouches[1]
    // || changedTouches[0]` paired this touch with itself, reporting a
    // distance of 0 instead of the true final 150px spread.
    el.dispatchEvent(touchEvent("touchend", [], [{ clientX: 150, clientY: 0 }]));

    expect(onPinch).toHaveBeenCalledTimes(1);
    const [scale, distance] = onPinch.mock.calls[0];
    expect(distance).toBe(150);
    expect(scale).toBe(1.5);
  });

  it("reports the true final rotation angle when the final touchend's changedTouches has only one entry", () => {
    const onRotate = vi.fn();
    const el = setup({ onRotate });

    // touches[0] moves relative to a fixed touches[1] at the origin. The
    // hook treats an exact-zero initial angle as "no rotation in progress"
    // (initialRotationRef !== 0 gate), so the starting position is offset
    // slightly off the axis to give a genuine non-zero initial angle.
    const start = { clientX: 100, clientY: 10 };
    const end = { clientX: 100, clientY: 100 };
    const anchor = { clientX: 0, clientY: 0 };
    el.dispatchEvent(touchEvent("touchstart", [start, anchor]));
    el.dispatchEvent(touchEvent("touchmove", [end, anchor]));
    el.dispatchEvent(touchEvent("touchend", [], [end]));

    const initialAngle = Math.atan2(start.clientY - anchor.clientY, start.clientX - anchor.clientX) * (180 / Math.PI);
    const finalAngle = Math.atan2(end.clientY - anchor.clientY, end.clientX - anchor.clientX) * (180 / Math.PI);
    expect(onRotate).toHaveBeenCalledTimes(1);
    expect(onRotate.mock.calls[0][0]).toBeCloseTo(finalAngle - initialAngle, 5);
  });
});

describe("useGesture — touchcancel handling (bug #8 regression)", () => {
  it("resets pinch state on touchcancel so the next unrelated tap does not spuriously fire onPinch", () => {
    const onPinch = vi.fn();
    const onTap = vi.fn();
    const el = setup({ onPinch, onTap });

    // Start a two-finger pinch, then get interrupted (OS gesture takeover).
    el.dispatchEvent(touchEvent("touchstart", [{ clientX: 0, clientY: 0 }, { clientX: 100, clientY: 0 }]));
    el.dispatchEvent(touchEvent("touchcancel", []));

    // A completely unrelated single-finger tap right after.
    el.dispatchEvent(touchEvent("touchstart", [{ clientX: 10, clientY: 10 }]));
    el.dispatchEvent(touchEvent("touchend", [], [{ clientX: 10, clientY: 10 }]));

    expect(onPinch).not.toHaveBeenCalled();
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});
