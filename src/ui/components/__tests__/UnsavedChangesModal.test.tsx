import React from "react";
import { render, act, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { eventBus } from "../../../core/EventBus";
import { UNSAVED_CHANGES_EVENT } from "../../../react";
import { UnsavedChangesModal } from "../UnsavedChangesModal";

describe("UnsavedChangesModal — normal confirm/cancel flow still works", () => {
  it("resolves true when Leave is clicked", () => {
    render(<UnsavedChangesModal />);
    const resolveFn = vi.fn();
    act(() => {
      eventBus.emit(UNSAVED_CHANGES_EVENT, resolveFn);
    });
    fireEvent.click(screen.getByText("Leave"));
    expect(resolveFn).toHaveBeenCalledTimes(1);
    expect(resolveFn).toHaveBeenCalledWith(true);
  });

  it("resolves false when Stay is clicked", () => {
    render(<UnsavedChangesModal />);
    const resolveFn = vi.fn();
    act(() => {
      eventBus.emit(UNSAVED_CHANGES_EVENT, resolveFn);
    });
    fireEvent.click(screen.getByText("Stay"));
    expect(resolveFn).toHaveBeenCalledTimes(1);
    expect(resolveFn).toHaveBeenCalledWith(false);
  });
});

describe("UnsavedChangesModal — re-entrancy guard (bug regression)", () => {
  it("resolves the first pending promise with false when a second event arrives before it's answered", () => {
    render(<UnsavedChangesModal />);

    const resolveA = vi.fn();
    const resolveB = vi.fn();

    act(() => {
      eventBus.emit(UNSAVED_CHANGES_EVENT, resolveA);
    });
    act(() => {
      // Second navigation attempt fires before the user answered the first
      // dialog — before the fix, resolveA's promise would never settle.
      eventBus.emit(UNSAVED_CHANGES_EVENT, resolveB);
    });

    expect(resolveA).toHaveBeenCalledTimes(1);
    expect(resolveA).toHaveBeenCalledWith(false);
    expect(resolveB).not.toHaveBeenCalled();
  });
});
