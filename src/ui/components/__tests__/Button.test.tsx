import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Button } from "../Button";
import type { ActionDef } from "../../../_internal/shared/actions/action-registry";

const DELETE_ACTION: ActionDef = {
  id: "test.delete",
  label: "Delete",
  description: "test",
  kind: "danger",
  confirmation: {
    title: "Delete this?",
    body: "This cannot be undone.",
    confirmLabel: "Delete",
    confirmKind: "danger",
  },
};

describe("Button — asChild + confirmation (bug regression)", () => {
  it("gates a confirmed action behind the dialog even when rendered via asChild", () => {
    const onClick = vi.fn();
    render(
      <Button asChild action={DELETE_ACTION} onClick={onClick}>
        <a href="/somewhere">Delete</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Delete" });
    fireEvent.click(link);

    // Before the fix, asChild spread the raw onClick straight onto the
    // cloned child, completely bypassing the confirmation gate.
    expect(onClick).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("still fires onClick directly via asChild when there is no confirmation config", () => {
    const onClick = vi.fn();
    const plainAction: ActionDef = { id: "test.go", label: "Go", description: "test", kind: "primary" };
    render(
      <Button asChild action={plainAction} onClick={onClick}>
        <a href="/somewhere">Go</a>
      </Button>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Button — confirmation forwards the original triggering event (bug regression)", () => {
  it("passes the same event object the user originally clicked with, not the confirm button's own event", () => {
    let capturedTarget: EventTarget | null = null;
    const onClick = vi.fn((e: React.MouseEvent<HTMLButtonElement>) => {
      capturedTarget = e.currentTarget;
    });

    render(
      <Button action={DELETE_ACTION} onClick={onClick} data-testid="real-trigger">
        Delete
      </Button>,
    );

    const trigger = screen.getByTestId("real-trigger");
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    // Before the fix, `event.currentTarget` here was the confirm-dialog's
    // own "Delete" button, not the original trigger the user clicked.
    expect(capturedTarget).toBe(trigger);
  });
});
