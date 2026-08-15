import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { createRef } from "react";
import { HorizontalScroller } from "../HorizontalScroller";

// jsdom doesn't implement ResizeObserver — stub it so we can manually fire
// the callback the component registers, simulating a real container resize.
let resizeCallback: ((entries: Array<{ contentRect: { width: number } }>) => void) | undefined;

class MockResizeObserver {
  constructor(cb: (entries: Array<{ contentRect: { width: number } }>) => void) {
    resizeCallback = cb;
  }
  observe() {}
  disconnect() {}
}

describe("HorizontalScroller — loop mode without perView (bug #3 regression)", () => {
  const items = Array.from({ length: 5 }, (_, i) => ({ id: `item-${i}` }));
  let getBoundingClientRectSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resizeCallback = undefined;
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    // jsdom's real getBoundingClientRect always returns a zero rect; stub a
    // realistic item width so the loop-mode measurement path has something
    // non-zero to read, matching a real rendered item's natural size.
    getBoundingClientRectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({ width: 120, height: 80, top: 0, left: 0, right: 120, bottom: 80, x: 0, y: 0, toJSON: () => ({}) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    getBoundingClientRectSpy.mockRestore();
  });

  it("resolves itemWidth by measuring a rendered item when loop is set but perView is not", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <HorizontalScroller
        loop
        gap={10}
        scrollContainerRef={ref}
        items={items}
        renderItem={(item) => <span>{(item as { id: string }).id}</span>}
      />,
    );

    expect(resizeCallback).toBeDefined();
    act(() => {
      resizeCallback!([{ contentRect: { width: 600 } }]);
    });

    const firstItem = ref.current!.querySelector<HTMLElement>(".appkit-hscroller__item");
    expect(firstItem).not.toBeNull();
    // Before the fix, itemWidth never left `undefined` here because the
    // measurement effect required `perView` to run at all — items would
    // render with no explicit width style, and the clone-buffer offset /
    // edge teleporter effects (gated on `itemWidth === undefined`) would
    // never execute.
    expect(firstItem!.style.width).toBe("120px");
  });

  it("initializes scroll position past the left clone buffer once itemWidth resolves", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <HorizontalScroller
        loop
        gap={10}
        scrollContainerRef={ref}
        items={items}
        renderItem={(item) => <span>{(item as { id: string }).id}</span>}
      />,
    );

    act(() => {
      resizeCallback!([{ contentRect: { width: 600 } }]);
    });

    // loopCloneCount defaults to min(itemCount, 3) = 3 for a 5-item list with
    // no perView hint; stride = itemWidth(120) + gap(10) = 130.
    expect(ref.current!.scrollLeft).toBe(3 * 130);
  });
});
