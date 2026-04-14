"use client";

import React, { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Heading } from "./Typography";
import { Button } from "./Button";

/**
 * Modal — centered dialog with backdrop, multiple sizes, ESC-to-close, and scroll lock.
 *
 * Standalone @mohasinac/ui primitive. No app-specific imports.
 * Renders via React Portal for correct z-index layering.
 */

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  /** Additional classNames for the modal panel */
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "appkit-modal__panel--sm",
  md: "appkit-modal__panel--md",
  lg: "appkit-modal__panel--lg",
  xl: "appkit-modal__panel--xl",
  full: "appkit-modal__panel--full",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  className = "",
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Restore focus on close
  useEffect(() => {
    if (isOpen) {
      prevFocusRef.current = document.activeElement as HTMLElement;
      // Focus the panel itself so ESC works immediately
      requestAnimationFrame(() => panelRef.current?.focus());
    } else {
      prevFocusRef.current?.focus();
    }
  }, [isOpen]);

  // Trap focus inside modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="appkit-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="appkit-modal__backdrop"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={["appkit-modal__panel", SIZE_CLASSES[size], className].join(
          " ",
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="appkit-modal__header">
            {title && (
              <Heading level={2} id={titleId} className="appkit-modal__title">
                {title}
              </Heading>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onClose}
                className="appkit-modal__close"
                aria-label="Close"
              >
                <X className="appkit-modal__close-icon" />
              </Button>
            )}
          </div>
        )}

        {/* Scrollable body */}
        <div className="appkit-modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
