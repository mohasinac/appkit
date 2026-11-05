"use client"
import React from "react";
import { Heading } from "./Typography";
import { Button } from "./Button";
import { ActionRow } from "./ActionRow";
import { useHandMode } from "../../_internal/client/hand-mode";
import { DialogShell } from "./dialog-shell";

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
  const { hand } = useHandMode();
  /*
   * 🛑 `useState(false)` + `useEffect`, NOT `typeof document === "undefined"`
   * at render time — same fix, same root cause, as `Drawer.tsx` (found
   * 2026-11-02 via a real, reproducible hydration mismatch site-wide). See
   * that file's comment for the full explanation: branching on `document`
   * directly makes the server render `null` and the client's FIRST render
   * (before hydration settles) render the full portal, which is exactly
   * what hydration compares and rejects. Kept even though
   * `@radix-ui/react-portal` carries its own mount guard — redundant is
   * fine, dropping it unverified is how the bug comes back.
   */
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

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

  if (!mounted) {
    return null;
  }

  return (
    <DialogShell
      open={visible}
      onClose={onClose}
      dialogLabel={typeof title === "string" ? title : "Dialog"}
      wrapperClassName="appkit-modal"
      overlayClassName="appkit-modal__backdrop"
      contentClassName={["appkit-modal__panel", SIZE_CLASSES[size], className]
        .filter(Boolean)
        .join(" ")}
    >
      {(title || showCloseButton) && (
        <div
          className={hand === "left" ? "appkit-modal__header flex-row-reverse" : "appkit-modal__header"}
          data-section="modal-div-563"
        >
          {title ? (
            <Heading level={2} className="appkit-modal__title">
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

      <div className="appkit-modal__body" data-section="modal-div-564">{children}</div>
      {actions ? <ModalFooter>{actions}</ModalFooter> : null}
    </DialogShell>
  );
}

/**
 * A dialog's action row.
 *
 * `align="end"` on purpose: a dialog is at most 32rem wide, and stretching
 * Cancel/Confirm across it reads as a banner rather than a pair of controls.
 * The buttons are still sized from their own labels — they simply don't take
 * the leftover — and ActionRow's own narrow breakpoint collapses this to
 * full-width below 30rem, where a right-packed clump would read badly.
 *
 * `anchor` is available for a footer that needs meta on the left (a link, a
 * count). Use it instead of reintroducing `justify-between`, which with three
 * children opens the gulf BETWEEN the two buttons rather than beside them.
 */
export function ModalFooter({
  children,
  anchor,
  className = "",
}: {
  children: React.ReactNode;
  anchor?: React.ReactNode;
  className?: string;
}) {
  return (
    <ActionRow
      align="end"
      gap="md"
      anchor={anchor}
      className={[
        "border-t px-6 py-4 border-[var(--appkit-color-border-subtle)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-section="modal-div-565"
    >
      {children}
    </ActionRow>
  );
}
