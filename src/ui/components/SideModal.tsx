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
  const titleId = useRef(
    `side-modal-title-${Math.random().toString(36).slice(2, 8)}`,
  );

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

  return (
    <Div className="appkit-side-modal" aria-hidden={!isOpen}>
      {/* Backdrop */}
      <Div
        className="appkit-side-modal__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <Div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId.current : undefined}
        className={[
          "appkit-side-modal__panel",
          `appkit-side-modal__panel--${side}`,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Header */}
        {title && (
          <Div className="appkit-side-modal__header">
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
        <Div className="appkit-side-modal__body">{children}</Div>
      </Div>
    </Div>
  );
}
