"use client"
import React from "react";
import { createPortal } from "react-dom";
import { Heading } from "./Typography";
import { Button } from "./Button";

export interface ModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  actions?: React.ReactNode;
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
  open,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  actions,
  className = "",
}: ModalProps) {
  const visible = open ?? isOpen ?? false;
  const titleId = React.useId();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!visible) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  React.useEffect(() => {
    if (visible) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => panelRef.current?.focus());
      return;
    }
    previousFocusRef.current?.focus();
  }, [visible]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      onClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
      ),
    );

    if (!focusable.length) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!visible || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="appkit-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      onKeyDown={handleKeyDown}
    >
      <div
        className="appkit-modal__backdrop"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className={["appkit-modal__panel", SIZE_CLASSES[size], className]
          .filter(Boolean)
          .join(" ")}
      >
        {(title || showCloseButton) && (
          <div className="appkit-modal__header">
            {title ? (
              <Heading level={2} id={titleId} className="appkit-modal__title">
                {title}
              </Heading>
            ) : (
              <span />
            )}
            {showCloseButton ? (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onClose}
                className="appkit-modal__close"
                aria-label="Close"
              >
                <span className="appkit-modal__close-icon" aria-hidden="true">
                  ×
                </span>
              </Button>
            ) : null}
          </div>
        )}

        <div className="appkit-modal__body">{children}</div>
        {actions ? <ModalFooter>{actions}</ModalFooter> : null}
      </div>
    </div>,
    document.body,
  );
}

export function ModalFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "flex items-center justify-end gap-3 border-t border-zinc-100 px-6 py-4 dark:border-slate-800",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
