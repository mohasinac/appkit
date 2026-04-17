"use client";
import "client-only";

import React, { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Heading } from "./Typography";
import { Button } from "./Button";

/**
 * Drawer — slide-in panel from left, right, or bottom.
 *
 * Standalone @mohasinac/ui primitive. No app-specific imports.
 * Bottom variant gets `rounded-t-2xl` and can be swipe-dismissed via drag handle.
 */

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: "left" | "right" | "bottom";
  /** Width for left/right drawers. Default: 'md' */
  size?: "sm" | "md" | "lg" | "full";
  showCloseButton?: boolean;
  className?: string;
}

const SIDE_TRANSLATE = {
  left: {
    closed: "appkit-drawer__panel--left-closed",
    open: "appkit-drawer__panel--left-open",
    base: "appkit-drawer__panel--left",
  },
  right: {
    closed: "appkit-drawer__panel--right-closed",
    open: "appkit-drawer__panel--right-open",
    base: "appkit-drawer__panel--right",
  },
  bottom: {
    closed: "appkit-drawer__panel--bottom-closed",
    open: "appkit-drawer__panel--bottom-open",
    base: "appkit-drawer__panel--bottom",
  },
} as const;

const SIDE_SIZE: Record<"sm" | "md" | "lg" | "full", string> = {
  sm: "appkit-drawer__panel--sm",
  md: "appkit-drawer__panel--md",
  lg: "appkit-drawer__panel--lg",
  full: "appkit-drawer__panel--full",
};

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  side = "right",
  size = "md",
  showCloseButton = true,
  className = "",
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      prevFocusRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => panelRef.current?.focus());
    } else {
      prevFocusRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  const { closed, open, base } = SIDE_TRANSLATE[side];
  const isBottom = side === "bottom";

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`appkit-drawer ${isOpen ? "appkit-drawer--open" : "appkit-drawer--closed"}`}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className={`appkit-drawer__backdrop ${isOpen ? "appkit-drawer__backdrop--open" : "appkit-drawer__backdrop--closed"}`}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={[
          "appkit-drawer__panel",
          base,
          isBottom
            ? "appkit-drawer__panel--bottom-shell"
            : `${SIDE_SIZE[size]} appkit-drawer__panel--full-height`,
          isOpen ? open : closed,
          className,
        ].join(" ")}
      >
        {/* Drag handle (bottom drawer only) */}
        {isBottom && (
          <div className="appkit-drawer__drag-wrap">
            <div className="appkit-drawer__drag" aria-hidden="true" />
          </div>
        )}

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="appkit-drawer__header">
            {title && (
              <Heading level={2} className="appkit-drawer__title">
                {title}
              </Heading>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onClose}
                className="appkit-drawer__close"
                aria-label="Close"
              >
                <X className="appkit-drawer__close-icon" />
              </Button>
            )}
          </div>
        )}

        {/* Scrollable body */}
        <div className="appkit-drawer__body">{children}</div>

        {/* Footer */}
        {footer && <div className="appkit-drawer__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
