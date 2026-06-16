"use client";

import React, { useEffect, useCallback } from "react";
import { Button, Div, Row, Span, Stack } from "../../ui";
const __O = {
  yAuto: "overflow-y-auto",
} as const;

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
      <Div surface="overlay-sm" 
        className="absolute inset-0 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <Stack
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute bottom-0 inset-x-0 rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800 shadow-2xl ${maxHeight} animate-slide-up${className ? ` ${className}` : ""}`} surface="default"
      >
        {/* Handle and header */}
        <Row border="subtle" 
          justify="between"
          className="border-b shrink-0" padding="inline"
        >
          {/* Drag handle */}
          <Div surface="skeleton" className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 dark:bg-zinc-600" rounded="full" />

          {title && (
            <Span size="sm" weight="semibold" className="mt-2" color="primary">
              {title}
            </Span>
          )}

          <Button rounded="lg" 
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto mt-2 p-1.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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
        </Row>

        {/* Scrollable content */}
        <Div className={`flex-1 ${__O.yAuto} overscroll-contain pb-[env(safe-area-inset-bottom)]`}>
          {children}
        </Div>
      </Stack>
    </Div>
  );
}
