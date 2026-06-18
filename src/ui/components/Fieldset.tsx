import type { ReactNode } from "react";

/** Fieldset + Legend — primitive for grouped form controls. */
export type FieldsetTone = "default" | "muted" | "success" | "warning" | "danger";
export type FieldsetPadding = "none" | "sm" | "md" | "lg";

export interface FieldsetProps {
  children: ReactNode;
  tone?: FieldsetTone;
  padding?: FieldsetPadding;
  disabled?: boolean;
  form?: string;
  name?: string;
}

export interface LegendProps {
  children: ReactNode;
  /** Visually hide the legend (still announced by screen readers). */
  srOnly?: boolean;
}

const TONE_BORDER: Record<FieldsetTone, string> = {
  default: "border border-[var(--appkit-color-border)]",
  muted: "border border-[var(--appkit-color-border-subtle)]",
  success: "border border-[var(--appkit-color-success)]",
  warning: "border border-[var(--appkit-color-warning)]",
  danger: "border border-[var(--appkit-color-error)]",
};

const PADDING_CLS: Record<FieldsetPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Fieldset({
  children,
  tone = "default",
  padding = "md",
  disabled,
  form,
  name,
}: FieldsetProps) {
  return (
    <fieldset
      disabled={disabled}
      form={form}
      name={name}
      className={`rounded-lg ${TONE_BORDER[tone]} ${PADDING_CLS[padding]}`}
    >
      {children}
    </fieldset>
  );
}

export function Legend({ children, srOnly = false }: LegendProps) {
  return (
    <legend
      className={
        srOnly
          ? "sr-only"
          : "px-1 text-sm font-semibold text-[var(--appkit-color-text)]"
      }
    >
      {children}
    </legend>
  );
}
