"use client";

import * as React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { OverlayContext } from "./overlay-context";

export interface DialogShellProps {
  open: boolean;
  onClose: () => void;
  /**
   * The dialog's accessible name, independent of whatever visible heading
   * the caller renders inside `children`. Radix requires a `Dialog.Title`;
   * this keeps that requirement decoupled from each caller's own visual
   * header so no caller ends up with two titles on screen.
   */
  dialogLabel: string;
  wrapperClassName: string;
  overlayClassName: string;
  contentClassName: string;
  contentRef?: React.Ref<HTMLDivElement>;
  onKeyDownCapture?: React.KeyboardEventHandler<HTMLDivElement>;
  children: React.ReactNode;
}

/**
 * Shared Radix Dialog composition for `Modal`, `ConfirmDeleteModal`, and
 * `Button`'s internal confirmation dialog — the only three overlay surfaces
 * that actually render anywhere in this app (Phase 3a measurement: every
 * `<Tooltip`/`<Dropdown`/`<Menu` hit in the repo was dead or belonged to a
 * different library). Owns focus trap, Escape, outside-click, and portal
 * mounting so each caller's own component stops hand-rolling those.
 *
 * Callers keep their existing BEM classes on the wrapper/overlay/content —
 * only who owns `role`/`aria-modal`/focus changes, not the DOM class names,
 * so existing CSS needs only `[data-state]` animation variants added, not a
 * rewrite.
 */
export function DialogShell({
  open,
  onClose,
  dialogLabel,
  wrapperClassName,
  overlayClassName,
  contentClassName,
  contentRef,
  onKeyDownCapture,
  children,
}: DialogShellProps) {
  return (
    <RadixDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <RadixDialog.Portal>
        <OverlayContext.Provider value={true}>
          <div className={wrapperClassName}>
            <RadixDialog.Overlay className={overlayClassName} />
            <RadixDialog.Content
              ref={contentRef}
              className={contentClassName}
              aria-describedby={undefined}
              onKeyDownCapture={onKeyDownCapture}
            >
              <RadixDialog.Title className="appkit-sr-only">{dialogLabel}</RadixDialog.Title>
              {children}
            </RadixDialog.Content>
          </div>
        </OverlayContext.Provider>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
