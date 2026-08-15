import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BeforeAfterCard } from "../BeforeAfterCard";

const ITEM = {
  id: "item-1",
  beforeImageUrl: "/before.jpg",
  afterImageUrl: "/after.jpg",
  caption: "Test comparison",
};

describe("BeforeAfterCard — touchcancel cleans up drag state (bug regression)", () => {
  it("stops listening for window touchmove/touchend after a touchcancel mid-drag", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    render(<BeforeAfterCard item={ITEM} />);
    const slider = screen.getByRole("slider");

    fireEvent.touchStart(slider, { touches: [{ clientX: 10 }] });
    expect(addSpy).toHaveBeenCalledWith("touchcancel", expect.any(Function));

    // Before the fix, only touchend reset `dragging` — a cancelled touch
    // left the window-level mousemove/touchmove/touchend listeners attached
    // for the rest of the component's lifetime.
    fireEvent(window, new Event("touchcancel"));
    expect(removeSpy).toHaveBeenCalledWith("touchmove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("touchend", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("touchcancel", expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
