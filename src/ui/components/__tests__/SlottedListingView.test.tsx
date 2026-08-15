import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SlottedListingView } from "../SlottedListingView";

// `manageSearch`/`manageSort` are documented no-ops (see the JSDoc in
// SlottedListingView.tsx) — real consumers (CategoryProductsView,
// StoreProductsView, FAQPageContent) pass a self-managed `renderSearch`
// closure with `portal="public"` and no `manageSearch` prop, and rely on it
// always being invoked. This test locks in that contract so it isn't
// accidentally "fixed" into a regression later.
describe("SlottedListingView — renderSearch/renderSort always invoked regardless of manage* flags", () => {
  it("calls renderSearch even with portal=\"public\" and manageSearch omitted", () => {
    render(
      <SlottedListingView
        portal="public"
        renderSearch={() => <div data-testid="search-slot">search ui</div>}
      />,
    );
    expect(screen.getByTestId("search-slot")).toBeInTheDocument();
  });

  it("calls renderSort even with portal=\"public\" and manageSort omitted", () => {
    render(
      <SlottedListingView
        portal="public"
        renderSort={() => <div data-testid="sort-slot">sort ui</div>}
      />,
    );
    expect(screen.getByTestId("sort-slot")).toBeInTheDocument();
  });
});
