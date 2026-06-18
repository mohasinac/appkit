"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Dialog — primitive for the native `<dialog>` element.
 *
 * Distinct from `<Modal>` (which is a portal + AnimatePresence overlay).
 * `Dialog` is the right primitive for confirmation prompts that need the
 * browser's top-layer rendering (focus trap, ESC-to-close, scroll-lock).
 */
export type DialogPadding = "sm" | "md" | "lg";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  padding?: DialogPadding;
  /** Render as a non-modal dialog (`<dialog>.show()`). Default `false` → `showModal()`. */
  nonModal?: boolean;
  /**
   * Close when clicking the backdrop. Native `<dialog>` does not trigger a
   * backdrop click by default; we attach a click handler that compares the
   * event target against the dialog element.
   */
  closeOnBackdrop?: boolean;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}

const PADDING_CLS: Record<DialogPadding, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Dialog({
  open,
  onClose,
  children,
  padding = "md",
  nonModal = false,
  closeOnBackdrop = true,
  ...rest
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) {
      if (nonModal) node.show();
      else node.showModal();
    }
    if (!open && node.open) {
      node.close();
    }
  }, [open, nonModal]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    const handler = () => onClose();
    node.addEventListener("close", handler);
    return () => node.removeEventListener("close", handler);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={rest["aria-labelledby"]}
      aria-describedby={rest["aria-describedby"]}
      onClick={(event) => {
        if (!closeOnBackdrop) return;
        if (event.target === dialogRef.current) onClose();
      }}
      // padding comes from the typed enum.
      className={`rounded-xl bg-[var(--appkit-color-surface)] text-[var(--appkit-color-text)] shadow-xl border border-[var(--appkit-color-border)] ${PADDING_CLS[padding]} backdrop:bg-black/40 backdrop:backdrop-blur-sm`}
    >
      {children}
    </dialog>
  );
}
