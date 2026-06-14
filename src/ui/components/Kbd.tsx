import type { ReactNode } from "react";

/** Kbd — primitive for `<kbd>` (keyboard key affordance). */
export type KbdSize = "xs" | "sm" | "md";
export type KbdTone = "default" | "muted" | "brand";

export interface KbdProps {
  children: ReactNode;
  size?: KbdSize;
  tone?: KbdTone;
}

const SIZE_CLS: Record<KbdSize, string> = {
  xs: "text-[10px] px-1 py-0.5 rounded",
  sm: "text-xs px-1.5 py-0.5 rounded-md",
  md: "text-sm px-2 py-1 rounded-md",
};

const TONE_CLS: Record<KbdTone, string> = {
  default:
    "bg-[var(--appkit-color-surface)] text-[var(--appkit-color-text)] border-[var(--appkit-color-border)]",
  muted:
    "bg-[var(--appkit-color-border-subtle)] text-[var(--appkit-color-text-muted)] border-[var(--appkit-color-border)]",
  brand:
    "bg-[var(--appkit-color-primary-50)] text-[var(--appkit-color-primary)] border-[var(--appkit-color-primary-200)]",
};

export function Kbd({ children, size = "sm", tone = "default" }: KbdProps) {
  return (
    <kbd
      // audit-variant-ok: Kbd is the catalogued primitive for <kbd>.
      // size + tone come from typed enums.
      className={`inline-flex items-center font-mono font-semibold border shadow-sm ${SIZE_CLS[size]} ${TONE_CLS[tone]}`}
    >
      {children}
    </kbd>
  );
}
