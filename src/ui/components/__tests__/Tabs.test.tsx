import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "../Tabs";

// Regression coverage for the 2026-08-17 "Tabs dropdown-past-5" feature
// (commit f614b5774) and its 2026-08-18 consolidation into the single
// canonical pattern for every tab strip in the app (Phase 6c) — six
// previously hand-rolled tab implementations now depend on this behavior.
describe("Tabs / TabsList", () => {
  it("renders a horizontal tablist when 5 or fewer triggers are present", () => {
    render(
      <Tabs value="b" onChange={() => {}}>
        <TabsList>
          <TabsTrigger value="a">Alpha</TabsTrigger>
          <TabsTrigger value="b">Beta</TabsTrigger>
          <TabsTrigger value="c">Gamma</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(screen.getByRole("tablist")).toBeTruthy();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    // Assert the absence of the DROPDOWN, not the absence of an accessible
    // name: since 2026-08-26 the row tablist carries aria-label="Tabs" too
    // (it previously had no accessible name at all), so `getByLabelText`
    // no longer discriminates between the two branches — `combobox` does.
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("collapses to a dropdown <select> once there are more than 5 triggers", () => {
    render(
      <Tabs value="t3" onChange={() => {}}>
        <TabsList>
          {Array.from({ length: 6 }, (_, i) => (
            <TabsTrigger key={i} value={`t${i + 1}`}>{`Tab ${i + 1}`}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>,
    );
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    const dropdown = screen.getByLabelText("Tabs");
    expect(dropdown).toBeTruthy();
    expect((dropdown as HTMLSelectElement).value).toBe("t3");
  });

  it("folds a badge count into the collapsed dropdown's option label", () => {
    render(
      <Tabs value="products" onChange={() => {}}>
        <TabsList>
          <TabsTrigger value="products" badge={12}>Products</TabsTrigger>
          <TabsTrigger value="auctions" badge={3}>Auctions</TabsTrigger>
          <TabsTrigger value="pre-orders">Pre-orders</TabsTrigger>
          <TabsTrigger value="prize-draws">Prize Draws</TabsTrigger>
          <TabsTrigger value="bundles">Bundles</TabsTrigger>
          <TabsTrigger value="stores">Stores</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(screen.getByText("Products (12)")).toBeTruthy();
    expect(screen.getByText("Auctions (3)")).toBeTruthy();
    expect(screen.getByText("Pre-orders")).toBeTruthy();
  });

  it("calls onChange when a trigger is clicked (row mode)", () => {
    const onChange = vi.fn();
    render(
      <Tabs value="a" onChange={onChange}>
        <TabsList>
          <TabsTrigger value="a">Alpha</TabsTrigger>
          <TabsTrigger value="b">Beta</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    fireEvent.click(screen.getByText("Beta"));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("TabsContent only renders the panel matching the active value", () => {
    render(
      <Tabs value="b" onChange={() => {}}>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>,
    );
    expect(screen.queryByText("Panel A")).toBeNull();
    expect(screen.getByText("Panel B")).toBeTruthy();
  });
});
