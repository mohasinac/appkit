"use client";
import React from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { Div } from "./Div";
import { Heading } from "./Typography";
import { Row } from "./Layout";

export interface QuickCreateModalProps<T = unknown> {
  isOpen: boolean;
  title: string;
  onSave: () => Promise<T> | T;
  onSaved?: (doc: T) => void;
  onCancel: () => void;
  children: React.ReactNode;
  fullPageHref?: string;
  saveLabel?: string;
  cancelLabel?: string;
  isSaving?: boolean;
  saveDisabled?: boolean;
}

export function QuickCreateModal<T = unknown>({
  isOpen,
  title,
  onSave,
  onSaved,
  onCancel,
  children,
  fullPageHref,
  saveLabel = "Save",
  cancelLabel = "Cancel",
  isSaving = false,
  saveDisabled = false,
}: QuickCreateModalProps<T>) {
  const [busy, setBusy] = React.useState(false);
  const titleId = React.useId();
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onCancel, busy]);

  const handleSave = async () => {
    if (saveDisabled || busy) return;
    setBusy(true);
    try {
      const doc = await onSave();
      onSaved?.(doc);
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  const saving = busy || isSaving;

  return createPortal(
    <Div
      className="appkit-quick-create-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <Div
        className="appkit-quick-create-modal__backdrop"
        aria-hidden="true"
        onClick={() => !saving && onCancel()}
      />
      <Div
        ref={panelRef}
        tabIndex={-1}
        className="appkit-quick-create-modal__panel"
      >
        <Div className="appkit-quick-create-modal__header">
          <Heading level={2} id={titleId} className="appkit-quick-create-modal__title">
            {title}
          </Heading>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onCancel}
            aria-label="Close"
            disabled={saving}
          >
            ×
          </Button>
        </Div>
        <Div className="appkit-quick-create-modal__body">{children}</Div>
        <Div className="appkit-quick-create-modal__footer">
          {fullPageHref ? (
            <a
              href={fullPageHref}
              target="_blank"
              rel="noreferrer"
              className="appkit-quick-create-modal__full-link"
            >
              Add more details →
            </a>
          ) : (
            <span />
          )}
          <Row className="appkit-quick-create-modal__actions">
            <Button
              variant="ghost"
              type="button"
              onClick={onCancel}
              disabled={saving}
            >
              {cancelLabel}
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleSave}
              disabled={saving || saveDisabled}
              isLoading={saving}
            >
              {saveLabel}
            </Button>
          </Row>
        </Div>
      </Div>
    </Div>,
    document.body,
  );
}
