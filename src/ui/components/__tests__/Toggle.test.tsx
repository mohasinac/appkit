import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Toggle } from "../Toggle";

describe("Toggle — label click fires onChange exactly once (bug regression)", () => {
  it("does not double-fire onChange when the label text is clicked", () => {
    const onChange = vi.fn();
    render(<Toggle label="Enable X" onChange={onChange} />);

    const label = screen.getByText("Enable X");
    fireEvent.click(label);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("still fires exactly once when the switch itself is clicked directly", () => {
    const onChange = vi.fn();
    render(<Toggle label="Enable X" onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
