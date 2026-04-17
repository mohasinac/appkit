"use client";
import "client-only";

import { useEffect, useState } from "react";
import { eventBus } from "../../core";
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
        setResolve(() => resolveFn);
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleCancel}
    >
      <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <Card className="w-full max-w-md p-6">
          <Heading level={2} className="mb-2">
            {labels.title ?? "Unsaved changes"}
          </Heading>
          <Text className="mb-6">
            {labels.message ??
              "You have unsaved changes. Are you sure you want to leave this page?"}
          </Text>
          <div className="flex gap-3 justify-start">
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
