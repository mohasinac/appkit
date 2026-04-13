"use client";

import React, { useEffect, useCallback } from "react";
import { Button, Div, Span } from "../../ui";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Extra classes on the drawer panel */
  className?: string;
  /** Max height of the sheet. Defaults to "max-h-[85dvh]" */
  maxHeight?: string;
}

/**
 * BottomSheet — mobile-first drawer that slides up from the bottom.
 *
 * - Slides up from the bottom on mobile.
 * - Accessible: focuses trap not implemented (add `focus-trap-react` if needed),
 *   but `role="dialog"`, `aria-modal`, and `aria-label` are set.
 * - Closes on backdrop click or Escape key.
 * - Hidden on `lg:` and above (use a sidebar instead).
 *
 * @example
 * ```tsx
 * <BottomSheet open={isOpen} onClose={() => setIsOpen(false)} title="Filters">
 *   <FilterPanel />
 * </BottomSheet>
 * ```
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
  maxHeight = "max-h-[85dvh]",
}: BottomSheetProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <Div className="fixed inset-0 z-50 lg:hidden" role="presentation">
      {/* Backdrop */}
      <Div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <Div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute bottom-0 inset-x-0 flex flex-col rounded-t-2xl bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shadow-2xl ${maxHeight} animate-slide-up${className ? ` ${className}` : ""}`}
      >
        {/* Handle and header */}
        <Div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          {/* Drag handle */}
          <Div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />

          {title && (
            <Span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 mt-2">
              {title}
            </Span>
          )}

          <Button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto mt-2 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {/* ✕ */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </Div>

        {/* Scrollable content */}
        <Div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {children}
        </Div>
      </Div>
    </Div>
  );
}
