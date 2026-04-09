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
  active:
    "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-400/20",
  inactive:
    "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-zinc-100 text-zinc-600 ring-1 ring-zinc-500/10 dark:bg-slate-800 dark:text-zinc-400 dark:ring-zinc-400/20",
  pending:
    "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-400/20",
  approved:
    "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-400/20",
  rejected:
    "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-400/20",
  // Semantic badges
  success:
    "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-400/20",
  warning:
    "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-400/20",
  danger:
    "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-400/20",
  info: "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-600/20 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-400/20",
  // Role badges
  admin:
    "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 ring-1 ring-purple-600/20 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-400/20",
  moderator:
    "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-600/20 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-400/20",
  seller:
    "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-600/20 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-400/20",
  user: "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-zinc-100 text-zinc-700 ring-1 ring-zinc-500/10 dark:bg-slate-800 dark:text-zinc-300 dark:ring-zinc-400/20",
  // Legacy / generic variants
  default:
    "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-zinc-100 text-zinc-700 ring-1 ring-zinc-500/10 dark:bg-slate-800 dark:text-zinc-300 dark:ring-zinc-400/20",
  primary:
    "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300",
  secondary:
    "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300",
} as const;

export type BadgeVariant = keyof typeof BADGE_CLASSES;

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <Span className={`${BADGE_CLASSES[variant]} ${className}`}>{children}</Span>
  );
}
