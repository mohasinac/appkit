"use client"
import React from "react";
import { Button } from "./Button";
import { Drawer } from "./Drawer";
import { Span } from "./Typography";

export interface FilterDrawerProps {
  children: React.ReactNode;
  title?: string;
  open?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onApply?: () => void;
  onReset?: () => void;
  activeCount?: number;
  pendingCount?: number;
  triggerLabel?: string;
  triggerClassName?: string;
  hideTrigger?: boolean;
  /** Which side the drawer slides in from. Default: "bottom" (slides up, mobile-first). */
  side?: "left" | "right" | "bottom";
}

export function FilterDrawer({
  children,
  title = "Filters",
  open,
  onOpen,
  onClose,
  onApply,
  onReset,
  activeCount = 0,
  pendingCount,
  triggerLabel = "Filters",
  triggerClassName = "",
  hideTrigger = false,
  side = "bottom",
}: FilterDrawerProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const handleOpen = () => {
    if (isControlled) {
      onOpen?.();
      return;
    }
    setInternalOpen(true);
  };

  const handleClose = () => {
    if (isControlled) {
      onClose?.();
      return;
    }
    setInternalOpen(false);
  };

  const handleApply = () => {
    onApply?.();
    if (!isControlled) {
      setInternalOpen(false);
    }
  };

  return (
    <>
      {!hideTrigger ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!isOpen) handleOpen();
          }}
          className={["appkit-filter-drawer__trigger", triggerClassName]
            .filter(Boolean)
            .join(" ")}
          aria-label={triggerLabel}
        >
          <Span>{triggerLabel}</Span>
          {activeCount > 0 ? (
            <Span className="appkit-filter-drawer__badge">{activeCount}</Span>
          ) : null}
        </Button>
      ) : null}

      <Drawer
        isOpen={isOpen}
        onClose={handleClose}
        title={title}
        side={side}
        footer={
          <div className="appkit-filter-drawer__footer">
            <Button type="button" variant="ghost" onClick={onReset}>
              Reset all
            </Button>
            <Button type="button" variant="primary" onClick={handleApply}>
              {pendingCount != null && pendingCount > 0
                ? `Apply (${pendingCount})`
                : "Apply"}
            </Button>
          </div>
        }
      >
        <div className="appkit-filter-drawer__body">{children}</div>
      </Drawer>
    </>
  );
}
