"use client";

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
    closed: "-translate-x-full",
    open: "translate-x-0",
    base: "left-0 top-0 bottom-0",
  },
  right: {
    closed: "translate-x-full",
    open: "translate-x-0",
    base: "right-0 top-0 bottom-0",
  },
  bottom: {
    closed: "translate-y-full",
    open: "translate-y-0",
    base: "bottom-0 left-0 right-0",
  },
} as const;

const SIDE_SIZE: Record<"sm" | "md" | "lg" | "full", string> = {
  sm: "w-72",
  md: "w-80 sm:w-96",
  lg: "w-full sm:w-[480px]",
  full: "w-full",
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
      className={`fixed inset-0 z-50 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
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
          "absolute bg-white dark:bg-slate-900",
          "shadow-2xl ring-1 ring-zinc-200 dark:ring-slate-700",
          "flex flex-col",
          "transition-transform duration-300 ease-out",
          base,
          isBottom ? "rounded-t-2xl max-h-[90vh]" : `${SIDE_SIZE[size]} h-full`,
          isOpen ? open : closed,
          className,
        ].join(" ")}
      >
        {/* Drag handle (bottom drawer only) */}
        {isBottom && (
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div
              className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-slate-600"
              aria-hidden="true"
            />
          </div>
        )}

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-slate-800 flex-shrink-0">
            {title && (
              <Heading
                level={2}
                className="!text-base !font-semibold !font-sans"
              >
                {title}
              </Heading>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onClose}
                className="ml-auto p-1.5 !min-h-0 rounded-lg text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 border-t border-zinc-100 dark:border-slate-800 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
