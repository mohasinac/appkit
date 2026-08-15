import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { usePullToRefresh } from "../usePullToRefresh";

interface Point {
  clientX: number;
  clientY: number;
}

function touchEvent(type: string, touches: Point[]): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true }) as Event & { touches: Point[] };
  ev.touches = touches;
  return ev;
}

function TestHarness({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const { containerRef, isPulling, progress } = usePullToRefresh(onRefresh, { threshold: 80 });
  return (
    <div ref={containerRef} data-testid="container">
      <span data-testid="pulling">{String(isPulling)}</span>
      <span data-testid="progress">{progress}</span>
    </div>
  );
}

describe("usePullToRefresh — touchcancel handling (bug #8 regression)", () => {
  it("resets isPulling/progress without calling onRefresh when the touch is cancelled mid-pull", () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<TestHarness onRefresh={onRefresh} />);
    const el = screen.getByTestId("container");

    act(() => {
      el.dispatchEvent(touchEvent("touchstart", [{ clientX: 0, clientY: 0 }]));
      el.dispatchEvent(touchEvent("touchmove", [{ clientX: 0, clientY: 40 }]));
    });
    expect(screen.getByTestId("pulling").textContent).toBe("true");
    expect(Number(screen.getByTestId("progress").textContent)).toBeCloseTo(0.5, 5);

    // Interrupted mid-pull — before the fix, isPulling/progress stay frozen
    // at whatever they were since only touchend ever reset them.
    act(() => {
      el.dispatchEvent(touchEvent("touchcancel", []));
    });
    expect(screen.getByTestId("pulling").textContent).toBe("false");
    expect(Number(screen.getByTestId("progress").textContent)).toBe(0);
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
