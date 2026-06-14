"use client";
import React, { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { twMerge } from "tailwind-merge";
import { Loader2 } from "lucide-react";
import type { ActionDef } from "../../_internal/shared/actions/action-registry";
import { surfaceError } from "../../client/api/surface-error";
import { useToastSafe } from "./Toast";

function spawnRipple(host: HTMLElement, clientX: number, clientY: number) {
  const rect = host.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const ripple = document.createElement("span");
  ripple.className = "appkit-button__ripple";
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${clientX - rect.left - size / 2}px`;
  ripple.style.top = `${clientY - rect.top - size / 2}px`;
  host.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
}

/**
 * Button — versatile button with multiple variants, sizes, and loading state.
 *
 * Extracted from src/components/ui/Button.tsx for @mohasinac/ui.
 * Theme values inlined from THEME_CONSTANTS.button and THEME_CONSTANTS.colors.button.
 */

// Inlined from THEME_CONSTANTS
const UI_BUTTON = {
  base: "appkit-button",
  variants: {
    primary: "appkit-button--primary",
    secondary: "appkit-button--secondary",
    outline: "appkit-button--outline",
    ghost: "appkit-button--ghost",
    danger: "appkit-button--danger",
    warning: "appkit-button--warning",
  },
  sizes: {
    sm: "appkit-button--sm",
    md: "appkit-button--md",
    lg: "appkit-button--lg",
  },
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof UI_BUTTON.variants;
  size?: keyof typeof UI_BUTTON.sizes;
  isLoading?: boolean;
  children?: React.ReactNode;
  /** Render as the child element (e.g. next/link) with button styling applied */
  asChild?: boolean;
  /**
   * CTA registry action — auto-fills children (label), aria-label, variant, and
   * shows a confirmation dialog before firing onClick when action.confirmation is set.
   * Children and aria-label props override the action defaults when explicitly provided.
   */
  action?: ActionDef;
}

// Map ActionKind → Button variant (caller can override via explicit variant prop)
const ACTION_KIND_VARIANT: Record<string, keyof typeof UI_BUTTON.variants> = {
  primary: "primary",
  secondary: "secondary",
  danger: "danger",
  ghost: "ghost",
  link: "ghost",
  chip: "outline",
};

export function Button({
  variant,
  size = "md",
  className = "",
  isLoading = false,
  disabled,
  children,
  asChild = false,
  action,
  ...props
}: ButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Resolve defaults from action registry
  const resolvedVariant = variant ?? (action ? (ACTION_KIND_VARIANT[action.kind] ?? "primary") : "primary");
  const resolvedChildren = children ?? (action ? action.label : undefined);
  const resolvedAriaLabel = props["aria-label"] ?? (action ? (action.ariaLabel ?? action.label) : undefined);

  const classes = twMerge(
    UI_BUTTON.base,
    UI_BUTTON.variants[resolvedVariant],
    UI_BUTTON.sizes[size],
    className,
  );

  const userOnClick = props.onClick;
  const toast = useToastSafe();

  // Wrap the user's onClick so async rejections never escape silently. Errors
  // route through surfaceError (toast / inline / report). Sync errors re-throw
  // so framework error boundaries still see them; only Promise rejections are
  // intercepted (we can't await sync handlers from inside React's event path).
  const wrapAsync = useCallback(
    (fn: ((e: React.MouseEvent<HTMLButtonElement>) => unknown) | undefined) =>
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!fn) return;
        let returned: unknown;
        try {
          returned = fn(event);
        } catch (err) {
          // Sync throw: route through surfaceError if possible, else re-throw
          if (toast) {
            surfaceError(err, { showToast: toast.showToast });
            return;
          }
          throw err;
        }
        if (returned && typeof (returned as Promise<unknown>).then === "function") {
          (returned as Promise<unknown>).catch((err: unknown) => {
            if (toast) {
              surfaceError(err, { showToast: toast.showToast });
              return;
            }
            // No toast provider mounted — let the error bubble.
            // eslint-disable-next-line no-console
            console.error("[Button] unhandled async onClick rejection", err);
          });
        }
      },
    [toast],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !isLoading) {
        spawnRipple(event.currentTarget, event.clientX, event.clientY);
      }
      if (action?.confirmation) {
        event.preventDefault();
        setConfirmOpen(true);
        return;
      }
      wrapAsync(userOnClick)(event);
    },
    [disabled, isLoading, action, userOnClick, wrapAsync],
  );

  const handleConfirm = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setConfirmOpen(false);
      wrapAsync(userOnClick)(event);
    },
    [userOnClick, wrapAsync],
  );

  if (asChild && React.isValidElement(resolvedChildren)) {
    const child = resolvedChildren as React.ReactElement<Record<string, unknown>>;
    return React.cloneElement(child, {
      ...props,
      className: twMerge(String(child.props.className ?? ""), classes),
      ...(disabled ? { "aria-disabled": true } : {}),
    });
  }

  const confirmDef = action?.confirmation;
  const confirmVariant = confirmDef?.confirmKind
    ? (ACTION_KIND_VARIANT[confirmDef.confirmKind] ?? "primary")
    : "primary";

  return (
    <>
      <button
        className={classes}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
        aria-label={resolvedAriaLabel}
        onClick={handleClick}
      >
        {isLoading && (
          <Loader2 className="appkit-button__spinner" aria-hidden="true" />
        )}
        {isLoading ? (
          <span className="appkit-button__content appkit-button__content--loading">
            {resolvedChildren}
          </span>
        ) : (
          <span className="appkit-button__content">{resolvedChildren}</span>
        )}
      </button>

      {confirmOpen && confirmDef && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="appkit-action-confirm-title"
          style={{
            position: "fixed", inset: 0, zIndex: "var(--appkit-z-modal, 1000)" as string,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmOpen(false); }}
        >
          <div
            style={{
              background: "var(--appkit-color-surface)",
              borderRadius: "var(--appkit-radius-lg, 12px)",
              padding: "1.5rem",
              maxWidth: "380px", width: "calc(100% - 2rem)",
              boxShadow: "var(--appkit-shadow-lg, 0 20px 60px rgba(0,0,0,0.2))",
            }}
          >
            <p
              id="appkit-action-confirm-title"
              style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "1rem" }}
            >
              {confirmDef.title}
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--appkit-color-text-muted)", marginBottom: "1.25rem" }}>
              {confirmDef.body}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
                {confirmDef.cancelLabel ?? "Cancel"}
              </Button>
              <Button variant={confirmVariant} size="sm" onClick={handleConfirm}>
                {confirmDef.confirmLabel}
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
