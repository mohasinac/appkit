"use client";
import React from "react";
import type { ZodTypeAny } from "zod";
import { Row } from "./Layout";
import { buildSurfaceClasses, type SurfaceProps } from "./surface-tokens";
import {
  FormShellContext,
  useFormShellState,
  type UseFormShellStateResult,
} from "../forms/FormShell";

export type FormSpacing = "none" | "xs" | "sm" | "md" | "lg" | "xl";

const FORM_SPACING_MAP: Record<FormSpacing, string> = {
  none: "",
  xs: "space-y-1",
  sm: "space-y-2",
  md: "space-y-4",
  lg: "space-y-6",
  xl: "space-y-8",
};

export interface FormProps
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "children">, SurfaceProps {
  /**
   * Either a React node or a render function that receives the FormShell
   * helpers. Use the function form when the submit handler needs to surface
   * server-side errors inline on a `<FieldInput>` via `setFieldError`.
   */
  children:
    | React.ReactNode
    | ((helpers: UseFormShellStateResult) => React.ReactNode);
  /** Vertical spacing between top-level children. */
  spacing?: FormSpacing;
  /**
   * Zod schema that validates the form values. When set, the render-prop
   * helpers' `validate(values)` returns the parsed Zod result; `setFieldError`
   * accepts the path of any Zod field. Eliminates the `useFormShellState(schema)`
   * boilerplate per callsite.
   */
  schema?: ZodTypeAny;
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
export function Form({ children, spacing, schema, surface, padding, rounded, border, shadow, className = "", ...props }: FormProps) {
  const helpers = useFormShellState(schema);
  const content =
    typeof children === "function"
      ? (children as (h: UseFormShellStateResult) => React.ReactNode)(helpers)
      : children;
  return (
    <FormShellContext.Provider value={helpers.shellCtx}>
      <form
        className={[
          "appkit-form",
          spacing ? FORM_SPACING_MAP[spacing] : "",
          buildSurfaceClasses({ surface, padding, rounded, border, shadow }),
          className,
        ].filter(Boolean).join(" ")}
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
