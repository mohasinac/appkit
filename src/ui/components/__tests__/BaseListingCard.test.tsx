import React from "react";
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BaseListingCard } from "../BaseListingCard";

// Regression: `aspect` used to accept any string and interpolate it into a
// `aspect-[${aspect}]` Tailwind arbitrary-value class, which Tailwind's
// static JIT scanner can never see (it only extracts literal text), so no
// CSS rule was ever generated for non-"square"/"4/3" values. The prop is now
// typed to only the two literal values that have a real, statically-scanned
// class name.
describe("BaseListingCard.Hero — aspect renders only literal, scannable classes (bug regression)", () => {
  it('renders "aspect-square" for aspect="square"', () => {
    const { container } = render(
      <BaseListingCard.Hero aspect="square">x</BaseListingCard.Hero>,
    );
    expect(container.firstChild).toHaveProperty("className", expect.stringContaining("aspect-square"));
  });

  it('renders the literal "aspect-[4/3]" class for aspect="4/3" and for the default (omitted)', () => {
    const { container: withProp } = render(
      <BaseListingCard.Hero aspect="4/3">x</BaseListingCard.Hero>,
    );
    const { container: withDefault } = render(<BaseListingCard.Hero>x</BaseListingCard.Hero>);
    expect((withProp.firstChild as HTMLElement).className).toContain("aspect-[4/3]");
    expect((withDefault.firstChild as HTMLElement).className).toContain("aspect-[4/3]");
  });
});
