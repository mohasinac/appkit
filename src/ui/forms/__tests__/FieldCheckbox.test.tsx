import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FieldCheckbox } from "../FieldCheckbox";

describe("FieldCheckbox — error rendered once, not twice (bug regression)", () => {
  it("renders exactly one role=alert error message", () => {
    render(
      <FieldCheckbox name="agree" label="I agree" error="You must agree" checked={false} onChange={vi.fn()} />,
    );
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].textContent).toBe("You must agree");
  });
});
