import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TagInput } from "../TagInput";

describe("TagInput — multi-tag paste (bug regression)", () => {
  it("keeps every comma-separated tag from a single paste, not just the last one", () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "red,green,blue" } });

    // Before the fix, each addTag() call in the loop computed off the same
    // stale `value=[]`, so the final onChange call only ever contained the
    // LAST processed tag ("green") — "red" was silently lost and "blue"
    // (the draft remainder after the last comma) wasn't submitted yet.
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(["red", "green"]);
  });

  it("does not add duplicate tags already present in value", () => {
    const onChange = vi.fn();
    render(<TagInput value={["red"]} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "red,green," } });
    expect(onChange).toHaveBeenCalledWith(["red", "green"]);
  });
});
