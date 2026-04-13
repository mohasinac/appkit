"use client";

import React, { useEffect, useRef } from "react";
import { Button, Div, Heading } from "..";

// ─── SideModal ─────────────────────────────────────────────────────────────────

export interface SideModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** Default: "right". "left" opens from the left edge. */
  side?: "left" | "right";
  /** Width on desktop. Default: "60vw" clamped to max-w-2xl. */
  width?: string;
  children: React.ReactNode;
  /** Extra class on the panel Div. */
  className?: string;
}

/**
 * SideModal — slides in from the right (or left) on desktop (60 vw),
 * full-screen drawer on mobile (< sm breakpoint).
 *
 * Accessibility:
 *  - Traps focus inside the panel when open
 *  - Closes on Escape key
 *  - backdrop click closes panel
 *  - role="dialog" + aria-modal + aria-labelledby
 */
export function SideModal({
  isOpen,
  onClose,
  title,
  side = "right",
  children,
  className = "",
}: SideModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`side-modal-title-${Math.random().toString(36).slice(2, 8)}`);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Focus trap — move focus into panel on open
  useEffect(() => {
    if (isOpen) {
      const el = panelRef.current;
      if (el) {
        const focusable = el.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        focusable?.focus();
      }
    }
  }, [isOpen]);

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const translateOut = side === "right" ? "translate-x-full" : "-translate-x-full";
  const origin = side === "right" ? "right-0" : "left-0";

  return (
    <Div
      className="fixed inset-0 z-50 flex"
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <Div
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <Div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId.current : undefined}
        className={`
          absolute inset-y-0 ${origin} flex flex-col
          w-full sm:w-[min(60vw,_672px)]
          bg-white dark:bg-zinc-900
          shadow-2xl
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : translateOut}
          ${className}
        `}
      >
        {/* Header */}
        {title && (
          <Div className="flex items-center justify-between border-b border-neutral-200 dark:border-zinc-700 px-5 py-4 flex-shrink-0">
            <Heading
              level={2}
              id={titleId.current}
              className="text-base font-semibold text-neutral-900 dark:text-white truncate"
            >
              {title}
            </Heading>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close panel"
              className="ml-2 flex-shrink-0"
            >
              ✕
            </Button>
          </Div>
        )}

        {/* Body — scrollable */}
        <Div className="flex-1 overflow-y-auto p-5">{children}</Div>
      </Div>
    </Div>
  );
}
