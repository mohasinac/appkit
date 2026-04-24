"use client"
import { useEffect } from "react";
import { Card } from "./Card";
import { Heading, Text } from "./Typography";
import { Button } from "./Button";

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDeleting?: boolean;
  /**
   * Controls icon colour and confirm-button variant.
   * - `"danger"`  — red icon + danger button (default; use for delete / destructive bulk actions)
   * - `"warning"` — amber icon + warning button (use for reversible bulk actions)
   * - `"primary"` — blue icon + primary button (use for non-destructive bulk actions: publish, approve)
   */
  variant?: "danger" | "warning" | "primary";
}

const UI_CONFIRM_MODAL = {
  backdrop: "appkit-confirm-modal__backdrop",
  body: "appkit-confirm-modal__body",
  iconWrap: "appkit-confirm-modal__icon-wrap",
  icon: "appkit-confirm-modal__icon",
  iconVariant: {
    danger: "appkit-confirm-modal__icon--danger",
    warning: "appkit-confirm-modal__icon--warning",
    primary: "appkit-confirm-modal__icon--primary",
  },
  iconSvg: "appkit-confirm-modal__icon-svg",
  content: "appkit-confirm-modal__content",
  message: "appkit-confirm-modal__message",
  actions: "appkit-confirm-modal__actions",
  actionBtn: "appkit-confirm-modal__action-btn",
} as const;

const VARIANT_STYLES = {
  danger: {
    buttonVariant: "danger" as const,
    loadingText: "Deleting...",
  },
  warning: {
    buttonVariant: "warning" as const,
    loadingText: "Processing...",
  },
  primary: {
    buttonVariant: "primary" as const,
    loadingText: "Processing...",
  },
} as const;

/**
 * ConfirmDeleteModal — generic confirmation dialog for destructive or bulk actions.
 *
 * @example
 * ```tsx
 * <ConfirmDeleteModal
 *   isOpen={isOpen}
 *   onClose={() => setOpen(false)}
 *   onConfirm={handleDelete}
 *   title="Delete product?"
 *   variant="danger"
 * />
 * ```
 */
export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Item?",
  message = "This action cannot be undone. Are you sure you want to delete this item?",
  confirmText = "Delete",
  cancelText = "Cancel",
  isDeleting = false,
  variant = "danger",
}: ConfirmDeleteModalProps) {
  const styles = VARIANT_STYLES[variant];

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="confirm-delete-modal"
      className={UI_CONFIRM_MODAL.backdrop}
      onClick={onClose}
    >
      <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <Card className={UI_CONFIRM_MODAL.body}>
          {/* Icon */}
          <div className={UI_CONFIRM_MODAL.iconWrap} data-section="confirmdeletemodal-div-469">
            <div
              className={[
                UI_CONFIRM_MODAL.icon,
                UI_CONFIRM_MODAL.iconVariant[variant],
              ].join(" ")}
             data-section="confirmdeletemodal-div-470">
              <svg
                className={UI_CONFIRM_MODAL.iconSvg}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className={UI_CONFIRM_MODAL.content} data-section="confirmdeletemodal-div-471">
            <Heading level={4}>{title}</Heading>
            <Text className={UI_CONFIRM_MODAL.message}>{message}</Text>
          </div>

          {/* Actions */}
          <div className={UI_CONFIRM_MODAL.actions} data-section="confirmdeletemodal-div-472">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isDeleting}
              className={UI_CONFIRM_MODAL.actionBtn}
            >
              {cancelText}
            </Button>
            <Button
              variant={styles.buttonVariant}
              onClick={onConfirm}
              disabled={isDeleting}
              className={UI_CONFIRM_MODAL.actionBtn}
            >
              {isDeleting ? styles.loadingText : confirmText}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
