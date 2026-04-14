import React from "react";
import { twMerge } from "tailwind-merge";
import { Loader2 } from "lucide-react";

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
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={twMerge(
        UI_BUTTON.base,
        UI_BUTTON.variants[variant],
        UI_BUTTON.sizes[size],
        className,
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
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
