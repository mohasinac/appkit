import React from "react";
import { Span } from "./Typography";

/**
 * Badge — compact label with ring border variants for status, roles, and categories.
 *
 * Extracted from src/components/ui/Badge.tsx for @mohasinac/ui.
 * Theme values inlined from THEME_CONSTANTS.badge and THEME_CONSTANTS.colors.badge.
 */

// Inlined from THEME_CONSTANTS.badge — full ring-border variants
const BADGE_CLASSES = {
  // Status badges
  active: "appkit-badge appkit-badge--active",
  inactive: "appkit-badge appkit-badge--inactive",
  pending: "appkit-badge appkit-badge--pending",
  approved: "appkit-badge appkit-badge--approved",
  rejected: "appkit-badge appkit-badge--rejected",
  // Semantic badges
  success: "appkit-badge appkit-badge--success",
  warning: "appkit-badge appkit-badge--warning",
  danger: "appkit-badge appkit-badge--danger",
  info: "appkit-badge appkit-badge--info",
  // Role badges
  admin: "appkit-badge appkit-badge--admin",
  moderator: "appkit-badge appkit-badge--moderator",
  seller: "appkit-badge appkit-badge--seller",
  employee: "appkit-badge appkit-badge--employee",
  user: "appkit-badge appkit-badge--user",
  // Legacy / generic variants
  default: "appkit-badge appkit-badge--default",
  primary: "appkit-badge appkit-badge--primary",
  secondary: "appkit-badge appkit-badge--secondary",
} as const;

export type BadgeVariant = keyof typeof BADGE_CLASSES;

/** Catalogue size enum for Badge. */
export type BadgeSize = "xs" | "sm" | "md";

const BADGE_SIZE_CLASS: Record<BadgeSize, string> = {
  xs: "appkit-badge--size-xs",
  sm: "appkit-badge--size-sm",
  md: "appkit-badge--size-md",
};

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  /** Size preset — defaults to `"sm"`. */
  size?: BadgeSize;
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  size = "sm",
  className = "",
}: BadgeProps) {
  return (
    <Span className={`${BADGE_CLASSES[variant]} ${BADGE_SIZE_CLASS[size]} ${className}`}>
      {children}
    </Span>
  );
}
