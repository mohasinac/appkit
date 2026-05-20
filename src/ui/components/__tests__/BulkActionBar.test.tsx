import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BulkActionBar } from "../BulkActionBar";

const actions = [
  { id: "publish", label: "Publish", onClick: vi.fn() },
  { id: "delete", label: "Delete", variant: "danger" as const, onClick: vi.fn() },
];

describe("BulkActionBar", () => {
  it("renders nothing when selectedCount is 0", () => {
    render(<BulkActionBar selectedCount={0} actions={actions} />);
    expect(screen.queryByTestId("bulk-action-bar")).toBeNull();
  });

  it("renders the bar when selectedCount > 0", () => {
    render(<BulkActionBar selectedCount={3} actions={actions} />);
    expect(screen.getByTestId("bulk-action-bar")).toBeTruthy();
  });

  it("shows the selected count in the count pill", () => {
    render(<BulkActionBar selectedCount={5} actions={actions} />);
    expect(screen.getByTestId("bulk-selected-count").textContent).toContain("5");
  });

  it("calls onClearSelection when the count pill button is clicked", () => {
    const onClear = vi.fn();
    render(<BulkActionBar selectedCount={2} actions={actions} onClearSelection={onClear} />);
    fireEvent.click(screen.getByRole("button", { name: /clear selection/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("renders no action buttons when actions array is empty", () => {
    render(<BulkActionBar selectedCount={1} actions={[]} />);
    expect(screen.queryByRole("button", { name: /apply/i })).toBeNull();
  });

  it("renders the picker trigger and apply button when actions are provided", () => {
    render(<BulkActionBar selectedCount={1} actions={actions} />);
    // Apply button must exist
    expect(screen.getByRole("button", { name: /apply/i })).toBeTruthy();
    // Picker trigger has aria-haspopup="listbox"
    expect(screen.getByRole("button", { expanded: false })).toBeTruthy();
  });

  it("opens the action picker on trigger click", () => {
    render(<BulkActionBar selectedCount={1} actions={actions} />);
    const trigger = screen.getByRole("button", { expanded: false });
    fireEvent.click(trigger);
    // Trigger now has aria-expanded="true"
    expect(screen.getByRole("button", { expanded: true })).toBeTruthy();
  });

  it("selects an action when an option is clicked and closes the picker", () => {
    render(<BulkActionBar selectedCount={1} actions={actions} />);
    // Open picker
    const trigger = screen.getByRole("button", { expanded: false });
    fireEvent.click(trigger);
    // Trigger is expanded
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    // Click Delete option
    fireEvent.click(screen.getByRole("option", { name: /delete/i }));
    // Picker should close — aria-expanded returns to false
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("calls the selected action's onClick when Apply is clicked", () => {
    const publishFn = vi.fn();
    const actionsWithFns = [
      { id: "publish", label: "Publish", onClick: publishFn },
    ];
    render(<BulkActionBar selectedCount={1} actions={actionsWithFns} />);
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    expect(publishFn).toHaveBeenCalledOnce();
  });

  it("executes the newly selected action when a different option is chosen then Apply clicked", () => {
    const publishFn = vi.fn();
    const deleteFn = vi.fn();
    const actionsWithFns = [
      { id: "publish", label: "Publish", onClick: publishFn },
      { id: "delete", label: "Delete", variant: "danger" as const, onClick: deleteFn },
    ];
    render(<BulkActionBar selectedCount={1} actions={actionsWithFns} />);
    // Select Delete via picker
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.click(screen.getByRole("option", { name: /delete/i }));
    // Apply
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    expect(deleteFn).toHaveBeenCalledOnce();
    expect(publishFn).not.toHaveBeenCalled();
  });

  it("disables the apply button when the selected action is disabled", () => {
    const disabledActions = [
      { id: "archive", label: "Archive", onClick: vi.fn(), disabled: true },
    ];
    render(<BulkActionBar selectedCount={1} actions={disabledActions} />);
    const applyBtn = screen.getByRole("button", { name: /apply/i }) as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
  });

  it("uses custom labels", () => {
    render(
      <BulkActionBar
        selectedCount={2}
        actions={actions}
        labels={{ apply: "Run", selected: "chosen" }}
      />,
    );
    expect(screen.getByRole("button", { name: /run/i })).toBeTruthy();
    expect(screen.getByTestId("bulk-selected-count").textContent).toContain("chosen");
  });
});
