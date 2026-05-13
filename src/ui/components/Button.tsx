"use client";
import React, { useCallback } from "react";
import { twMerge } from "tailwind-merge";
import { Loader2 } from "lucide-react";

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
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  isLoading = false,
  disabled,
  children,
  asChild = false,
  ...props
}: ButtonProps) {
  const classes = twMerge(
    UI_BUTTON.base,
    UI_BUTTON.variants[variant],
    UI_BUTTON.sizes[size],
    className,
  );

  const userOnClick = props.onClick;
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !isLoading) {
        spawnRipple(event.currentTarget, event.clientX, event.clientY);
      }
      userOnClick?.(event);
    },
    [disabled, isLoading, userOnClick],
  );

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    return React.cloneElement(child, {
      ...props,
      className: twMerge(String(child.props.className ?? ""), classes),
      ...(disabled ? { "aria-disabled": true } : {}),
    });
  }

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
      onClick={handleClick}
    >
      {isLoading && (
        <Loader2 className="appkit-button__spinner" aria-hidden="true" />
      )}
      {isLoading ? (
        <span className="appkit-button__content appkit-button__content--loading">
          {children}
        </span>
      ) : (
        <span className="appkit-button__content">{children}</span>
      )}
    </button>
  );
}
