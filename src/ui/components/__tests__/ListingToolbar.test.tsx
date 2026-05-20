import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ListingToolbar } from "../ListingToolbar";

describe("ListingToolbar", () => {
  it("renders the toolbar container", () => {
    render(<ListingToolbar />);
    expect(screen.getByTestId("listing-toolbar")).toBeTruthy();
  });

  it("renders search input when onSearchChange is provided", () => {
    render(<ListingToolbar onSearchChange={vi.fn()} searchValue="" searchPlaceholder="Find…" />);
    expect(screen.getByPlaceholderText("Find…")).toBeTruthy();
  });

  it("does not render search input when onSearchChange is absent", () => {
    render(<ListingToolbar />);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("calls onSearchChange when typing in the search input", () => {
    const onChange = vi.fn();
    render(<ListingToolbar onSearchChange={onChange} searchValue="" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "pokemon" } });
    expect(onChange).toHaveBeenCalledWith("pokemon");
  });

  it("calls onSearchCommit when Enter is pressed in the search input", () => {
    const onCommit = vi.fn();
    render(<ListingToolbar onSearchChange={vi.fn()} onSearchCommit={onCommit} searchValue="" />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onCommit).toHaveBeenCalledOnce();
  });

  it("calls onSearchCommit when the search button is clicked", () => {
    const onCommit = vi.fn();
    render(<ListingToolbar onSearchChange={vi.fn()} onSearchCommit={onCommit} searchValue="" />);
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    expect(onCommit).toHaveBeenCalledOnce();
  });

  it("renders filters button when onFiltersClick is provided", () => {
    const onClick = vi.fn();
    render(<ListingToolbar onFiltersClick={onClick} />);
    const btn = screen.getByRole("button", { name: /filters/i });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not render filters button when onFiltersClick is absent", () => {
    render(<ListingToolbar />);
    expect(screen.queryByRole("button", { name: /filters/i })).toBeNull();
  });

  it("shows filter count badge when filterCount > 0", () => {
    render(<ListingToolbar onFiltersClick={vi.fn()} filterCount={3} />);
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("renders grid and list view buttons when onViewChange is provided", () => {
    render(<ListingToolbar onViewChange={vi.fn()} view="grid" />);
    expect(screen.getByRole("button", { name: /grid view/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /list view/i })).toBeTruthy();
  });

  it("does not render view buttons when hideViewToggle is true", () => {
    render(<ListingToolbar onViewChange={vi.fn()} hideViewToggle view="grid" />);
    expect(screen.queryByRole("button", { name: /grid view/i })).toBeNull();
  });

  it("calls onViewChange with 'list' when list button is clicked", () => {
    const onViewChange = vi.fn();
    render(<ListingToolbar onViewChange={onViewChange} view="grid" />);
    fireEvent.click(screen.getByRole("button", { name: /list view/i }));
    expect(onViewChange).toHaveBeenCalledWith("list");
  });

  it("renders table view button only when showTableView is true", () => {
    const { rerender } = render(<ListingToolbar onViewChange={vi.fn()} view="grid" />);
    expect(screen.queryByRole("button", { name: /table view/i })).toBeNull();
    rerender(<ListingToolbar onViewChange={vi.fn()} view="grid" showTableView />);
    expect(screen.getByRole("button", { name: /table view/i })).toBeTruthy();
  });

  it("shows reset-all button only when onResetAll + hasActiveState are both truthy", () => {
    const onReset = vi.fn();
    const { rerender } = render(<ListingToolbar onResetAll={onReset} hasActiveState={false} />);
    expect(screen.queryByRole("button", { name: /reset all/i })).toBeNull();
    rerender(<ListingToolbar onResetAll={onReset} hasActiveState />);
    expect(screen.getByRole("button", { name: /reset all/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /reset all/i }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("renders bulk-mode controls when bulkMode is true", () => {
    render(
      <ListingToolbar
        bulkMode
        bulkSelectedCount={2}
        bulkTotalCount={10}
        onBulkSelectAll={vi.fn()}
        onBulkClear={vi.fn()}
      />,
    );
    expect(screen.getByText(/select all/i)).toBeTruthy();
    expect(screen.getByText(/2 selected/i)).toBeTruthy();
    expect(screen.getByText(/clear/i)).toBeTruthy();
  });

  it("calls onBulkSelectAll when Select All is clicked", () => {
    const onSelectAll = vi.fn();
    render(
      <ListingToolbar bulkMode bulkSelectedCount={0} bulkTotalCount={5} onBulkSelectAll={onSelectAll} />,
    );
    fireEvent.click(screen.getByText(/select all/i));
    expect(onSelectAll).toHaveBeenCalledOnce();
  });

  it("calls onBulkClear when Clear button is clicked", () => {
    const onClear = vi.fn();
    render(
      <ListingToolbar bulkMode bulkSelectedCount={2} bulkTotalCount={5} onBulkClear={onClear} />,
    );
    fireEvent.click(screen.getByText(/clear/i));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("shows 'Deselect All' label when all items are selected", () => {
    render(
      <ListingToolbar bulkMode bulkSelectedCount={5} bulkTotalCount={5} onBulkSelectAll={vi.fn()} />,
    );
    expect(screen.getByText(/deselect all/i)).toBeTruthy();
  });

  it("renders pill toggle buttons from the toggles prop", () => {
    const onToggle = vi.fn();
    const toggles = [
      { label: "In Stock", active: false, onChange: onToggle },
      { label: "Featured", active: true, onChange: vi.fn() },
    ];
    render(<ListingToolbar toggles={toggles} />);
    expect(screen.getByRole("switch", { name: "In Stock" })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Featured" })).toBeTruthy();
  });

  it("calls toggle onChange with flipped value when a pill toggle is clicked", () => {
    const onChange = vi.fn();
    const toggles = [{ label: "In Stock", active: false, onChange }];
    render(<ListingToolbar toggles={toggles} />);
    fireEvent.click(screen.getByRole("switch", { name: "In Stock" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("uses custom labels from the labels prop", () => {
    render(
      <ListingToolbar
        onFiltersClick={vi.fn()}
        labels={{ filters: "Refine" }}
      />,
    );
    expect(screen.getByRole("button", { name: /refine/i })).toBeTruthy();
  });
});
