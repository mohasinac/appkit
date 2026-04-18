import React from "react";
import { Row } from "./Layout";

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

export type GapToken = "none" | "xs" | "sm" | "md" | "lg" | "xl";

const GAP_MAP: Record<GapToken, string> = {
  none: "gap-0",
  xs: "gap-2",
  sm: "gap-3",
  md: "gap-4 lg:gap-6",
  lg: "gap-6 lg:gap-8",
  xl: "gap-8 lg:gap-10",
};

/**
 * Semantic `<form>` wrapper. Passes all standard form attributes through.
 */
export function Form({ children, className = "", ...props }: FormProps) {
  return (
    <form
      className={["appkit-form", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </form>
  );
}

export interface FormGroupProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: GapToken;
  className?: string;
}

export function FormGroup({
  children,
  columns = 1,
  gap = "md",
  className = "",
}: FormGroupProps) {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  } as const;

  return (
    <div
      className={[
        "appkit-form-group",
        gridClasses[columns],
        GAP_MAP[gap],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export interface FormFieldSpanProps {
  children: React.ReactNode;
  className?: string;
}

export function FormFieldSpan({
  children,
  className = "",
}: FormFieldSpanProps) {
  return (
    <div
      className={["appkit-form-field-span", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export interface FormActionsProps {
  children: React.ReactNode;
  align?: "left" | "center" | "right" | "between";
  className?: string;
}

export function FormActions({
  children,
  align = "left",
  className = "",
}: FormActionsProps) {
  const alignClass = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
    between: "justify-between",
  }[align];

  return (
    <Row
      wrap
      gap="md"
      className={["appkit-form-actions", alignClass, className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Row>
  );
}
