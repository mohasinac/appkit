import type { ReactNode } from "react";

/**
 * IconBox — primitive for the recurrent "square icon container" pattern
 * (flex-shrink-0 w-N h-N rounded-X flex items-center justify-center).
 *
 * Replaces ~13 raw inline implementations across feature views.
 */
export type IconBoxSize = "sm" | "md" | "lg" | "xl";
export type IconBoxTone =
  | "default"
  | "muted"
  | "brand"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "inverse";
export type IconBoxRounded = "md" | "lg" | "xl" | "2xl" | "full";

export interface IconBoxProps {
  children: ReactNode;
  size?: IconBoxSize;
  tone?: IconBoxTone;
  rounded?: IconBoxRounded;
  /** Render as `<span>` instead of `<div>` (for inline contexts). */
  as?: "div" | "span";
  /** Accessible label when the icon is meaningful. */
  "aria-label"?: string;
}

const SIZE_CLS: Record<IconBoxSize, string> = {
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-14 h-14 text-xl",
};

const ROUNDED_CLS: Record<IconBoxRounded, string> = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
};

const TONE_CLS: Record<IconBoxTone, string> = {
  default:
    "bg-[var(--appkit-color-surface)] text-[var(--appkit-color-text)] border border-[var(--appkit-color-border)]",
  muted:
    "bg-[var(--appkit-color-border-subtle)] text-[var(--appkit-color-text-muted)]",
  brand:
    "bg-[var(--appkit-color-primary-50)] text-[var(--appkit-color-primary)]",
  accent:
    "bg-[var(--appkit-color-secondary-50)] text-[var(--appkit-color-secondary)]",
  success:
    "bg-[var(--appkit-color-success-surface)] text-[var(--appkit-color-success)]",
  warning:
    "bg-[var(--appkit-color-warning-surface)] text-[var(--appkit-color-warning)]",
  danger:
    "bg-[var(--appkit-color-error-surface)] text-[var(--appkit-color-error)]",
  info:
    "bg-[var(--appkit-color-info-surface)] text-[var(--appkit-color-info)]",
  inverse:
    "bg-[var(--appkit-color-primary)] text-[var(--appkit-color-text-on-primary)]",
};

export function IconBox({
  children,
  size = "md",
  tone = "brand",
  rounded = "xl",
  as = "div",
  ...rest
}: IconBoxProps) {
  const Tag = as;
  return (
    <Tag
      aria-label={rest["aria-label"]}
      // square-icon-container pattern. size + tone + rounded come from typed enums.
      className={`inline-flex flex-shrink-0 items-center justify-center ${SIZE_CLS[size]} ${ROUNDED_CLS[rounded]} ${TONE_CLS[tone]}`}
    >
      {children}
    </Tag>
  );
}
