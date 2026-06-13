"use client";
import React from "react";
import { Row } from "./Layout";
import {
  FormShellContext,
  useFormShellState,
  type UseFormShellStateResult,
} from "../forms/FormShell";

export interface FormProps
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "children"> {
  /**
   * Either a React node or a render function that receives the FormShell
   * helpers. Use the function form when the submit handler needs to surface
   * server-side errors inline on a `<FieldInput>` via `setFieldError`.
   */
  children:
    | React.ReactNode
    | ((helpers: UseFormShellStateResult) => React.ReactNode);
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
 * Canonical `<Form>` wrapper. Mounts `FormShellContext.Provider` so child
 * `<FieldInput>` / `<FieldSelect>` / `<FieldTextarea>` / `<FieldCheckbox>`
 * surface errors inline without any extra wiring.
 *
 * For wizard-style multi-step forms with auto-save, draft, publish — use
 * `<FormShell steps={...}>` instead.
 *
 * Example:
 *   <Form onSubmit={onSubmit}>
 *     {({ setFieldError }) => (
 *       <>
 *         <FieldInput name="email" label="Email" required />
 *         <Button type="submit">Sign in</Button>
 *       </>
 *     )}
 *   </Form>
 */
export function Form({ children, className = "", ...props }: FormProps) {
  const helpers = useFormShellState();
  const content =
    typeof children === "function"
      ? (children as (h: UseFormShellStateResult) => React.ReactNode)(helpers)
      : children;
  return (
    <FormShellContext.Provider value={helpers.shellCtx}>
      <form
        className={["appkit-form", className].filter(Boolean).join(" ")}
        {...props}
      >
        {content}
      </form>
    </FormShellContext.Provider>
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
     data-section="form-div-503">
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
     data-section="form-div-504">
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
