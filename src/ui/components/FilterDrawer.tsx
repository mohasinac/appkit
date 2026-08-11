"use client"
import React from "react";
import { Button } from "./Button";
import { Drawer } from "./Drawer";
import { Span } from "./Typography";
import { sectionBackgroundStyle, type SectionBackgroundConfig } from "./Semantic";

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
  /** Which side the drawer slides in from. Default: "right". */
  side?: "left" | "right" | "bottom";
  /** Width for left/right drawers. Default: "md" (responsive: full-width on mobile, 24rem on desktop). */
  size?: "sm" | "md" | "lg" | "full";
  /** Optional color/gradient/image background for the drawer body — same shape as <Section background={…}>. */
  background?: SectionBackgroundConfig;
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
  side = "right",
  size = "md",
  background,
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
        size={size}
        className="appkit-drawer__panel--filter"
        footer={
          <div className="appkit-filter-drawer__footer" data-section="filterdrawer-div-494">
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
        <div
          className={[
            "appkit-filter-drawer__body",
            background?.value ? "relative overflow-hidden" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          data-section="filterdrawer-div-495"
        >
          {background?.value && (
            <>
              <Span aria-hidden className="absolute inset-0 -z-10" style={sectionBackgroundStyle(background)} />
              {background.overlay?.enabled && (
                <Span
                  aria-hidden
                  className="absolute inset-0 -z-10"
                  style={{ backgroundColor: background.overlay.color, opacity: background.overlay.opacity }}
                />
              )}
            </>
          )}
          {children}
        </div>
      </Drawer>
    </>
  );
}
