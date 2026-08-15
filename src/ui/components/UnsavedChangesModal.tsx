"use client";

import { useEffect, useState } from "react";
import { eventBus } from "../../core/EventBus";
import { UNSAVED_CHANGES_EVENT } from "../../react";
import { Button } from "./Button";
import { Card } from "./Card";
import { Heading, Text } from "./Typography";

type UnsavedChangesResolve = (confirmed: boolean) => void;

export interface UnsavedChangesLabels {
  title?: string;
  message?: string;
  stay?: string;
  leave?: string;
}

export interface UnsavedChangesModalProps {
  labels?: UnsavedChangesLabels;
}

/**
 * UnsavedChangesModal
 *
 * Mount this once near the app shell. It listens for the
 * UNSAVED_CHANGES_EVENT and resolves the pending leave promise.
 */
export function UnsavedChangesModal({ labels = {} }: UnsavedChangesModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [resolve, setResolve] = useState<UnsavedChangesResolve | null>(null);

  useEffect(() => {
    const subscription = eventBus.on(
      UNSAVED_CHANGES_EVENT,
      (...args: unknown[]) => {
        const resolveFn = args[0] as UnsavedChangesResolve;
        setResolve((prevResolve: UnsavedChangesResolve | null) => {
          // A second UNSAVED_CHANGES_EVENT arrived before the user answered
          // the first — resolve that abandoned promise with `false` instead
          // of silently overwriting it and leaving it pending forever.
          prevResolve?.(false);
          // Returning `resolveFn` directly (not `() => resolveFn`) is
          // correct here — the double-wrap trick is only needed when
          // passing setState a bare function *value* (to stop React from
          // treating it as an updater); inside an updater callback the
          // return value already becomes the next state as-is.
          return resolveFn;
        });
        setIsOpen(true);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  function handleConfirm() {
    setIsOpen(false);
    resolve?.(true);
    setResolve(null);
  }

  function handleCancel() {
    setIsOpen(false);
    resolve?.(false);
    setResolve(null);
  }

  if (!isOpen) return null;

  return (
    <div className="appkit-unsaved-modal__backdrop" onClick={handleCancel} data-section="unsavedchangesmodal-div-627">
      <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <Card className="appkit-unsaved-modal__card">
          <Heading level={2} className="appkit-unsaved-modal__title">
            {labels.title ?? "Unsaved changes"}
          </Heading>
          <Text className="appkit-unsaved-modal__message">
            {labels.message ??
              "You have unsaved changes. Are you sure you want to leave this page?"}
          </Text>
          <div className="appkit-unsaved-modal__actions" data-section="unsavedchangesmodal-div-629">
            <Button variant="outline" onClick={handleCancel}>
              {labels.stay ?? "Stay"}
            </Button>
            <Button variant="danger" onClick={handleConfirm}>
              {labels.leave ?? "Leave"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
