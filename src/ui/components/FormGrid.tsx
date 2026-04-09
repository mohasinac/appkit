// appkit/src/ui/components/FormGrid.tsx
import type { ReactNode } from "react";

export interface FormGridProps {
  children: ReactNode;
  /** Minimum field width in pixels before wrapping to a new row (default: 280) */
  minFieldWidth?: number;
  /** Gap between fields in pixels (default: 16) */
  gap?: number;
  className?: string;
}

export interface FormFieldProps {
  children: ReactNode;
  /**
   * - `"auto"` — fluid: `flex-1 min-w-[280px]` (default)
   * - `"full"` — always full width
   * - `"half"` — fixed 50%, min-width still respected
   */
  span?: "auto" | "full" | "half";
  className?: string;
}

/**
 * `FormGrid` — a flex-wrap container that naturally transitions from
 * multi-column to single-column without media queries.
 *
 * **Column count at given widths** (default minFieldWidth=280, gap=16):
 * | Container | Columns |
 * |-----------|---------|
 * | 360 px    | 1       |
 * | 600 px    | 2       |
 * | 900 px    | 3       |
 * | 1200 px   | 4       |
 *
 * @example
 * ```tsx
 * <FormGrid>
 *   <FormField><Label>First name</Label><Input name="firstName" /></FormField>
 *   <FormField><Label>Last name</Label><Input name="lastName" /></FormField>
 *   <FormField span="full"><Label>Bio</Label><Textarea name="bio" /></FormField>
 * </FormGrid>
 * ```
 */
export function FormGrid({
  children,
  minFieldWidth = 280,
  gap = 16,
  className,
}: FormGridProps) {
  return (
    <div
      className={`flex flex-wrap ${className ?? ""}`}
      style={{ gap: `${gap}px` }}
    >
      {children}
    </div>
  );
}

/**
 * `FormField` — a single form field slot inside a `FormGrid`.
 * Grows/shrinks to fill available space while respecting `minFieldWidth`.
 */
export function FormField({
  children,
  span = "auto",
  className,
}: FormFieldProps) {
  const spanClass =
    span === "full"
      ? "w-full"
      : span === "half"
        ? "w-1/2 min-w-[280px]"
        : "flex-1 min-w-[280px]";

  return (
    <div className={`${spanClass} flex flex-col gap-1.5 ${className ?? ""}`}>
      {children}
    </div>
  );
}
