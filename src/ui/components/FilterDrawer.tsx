"use client";

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
          className={[
            "inline-flex items-center gap-2",
            "rounded-lg border-zinc-300 text-zinc-700 hover:bg-zinc-100",
            "dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
            triggerClassName,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label={triggerLabel}
        >
          <Span>{triggerLabel}</Span>
          {activeCount > 0 ? (
            <Span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-xs text-white">
              {activeCount}
            </Span>
          ) : null}
        </Button>
      ) : null}

      <Drawer
        isOpen={isOpen}
        onClose={handleClose}
        title={title}
        side="left"
        footer={
          <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-4 py-3 dark:border-slate-700">
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
        <div className="divide-y divide-zinc-200 dark:divide-slate-700">
          {children}
        </div>
      </Drawer>
    </>
  );
}
