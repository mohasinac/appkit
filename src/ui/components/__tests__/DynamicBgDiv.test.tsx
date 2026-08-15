import React from "react";
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DynamicBgDiv } from "../DynamicBgDiv";

describe("DynamicBgDiv — stale inline styles cleared on prop change (bug regression)", () => {
  it("clears a previous `background` shorthand when re-rendered with color instead", () => {
    const { container, rerender } = render(<DynamicBgDiv background="red" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.cssText).toContain("background");

    rerender(<DynamicBgDiv color="#00ff00" />);
    // Before the fix, the stale `background` shorthand from the previous
    // render was never cleared, so it kept overriding backgroundColor.
    expect(el.style.cssText).not.toContain("background:");
    expect(el.style.backgroundColor).toBe("rgb(0, 255, 0)");
  });

  it("clears textColor when the prop is removed on a later render", () => {
    const { container, rerender } = render(<DynamicBgDiv textColor="#ff0000" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.color).toBe("rgb(255, 0, 0)");

    rerender(<DynamicBgDiv />);
    expect(el.style.color).toBe("");
  });
});
