"use client";
import React from "react";
import type { ZodTypeAny } from "zod";
import { Row } from "./Layout";
import { buildSurfaceClasses, type SurfaceProps } from "./surface-tokens";
import {
  FormShellContext,
  useFormShellState,
  type FormShellContextValue,
  type UseFormShellStateResult,
} from "../forms/FormShell";
import { useFormBottomActions } from "../../features/layout/hooks/useFormBottomActions";

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
  /**
   * Use an externally-computed `FormShellContextValue` (e.g. from a parent's
   * own `useFormShellState(schema)` call) instead of `<Form>` creating its
   * own. Needed when other elements outside this `<form>` — a submit button
   * in a separate sidebar, associated via the HTML `form` attribute — must
   * share the exact same validation state; otherwise `<Form>`'s own internal
   * provider would shadow the parent's for everything rendered as `children`.
   */
  shellCtx?: FormShellContextValue;
  /**
   * Publish Save/Cancel and the mobile error sheet into the bottom-chrome
   * tier — the same bar the cart uses.
   *
   * Opt-IN, unlike `<SectionForm>` where it is on by default. `<Form>` is the
   * generic wrapper and is used inside `<Modal>` and `<SideDrawer>` footers,
   * inside listing toolbars, and several times over on one page
   * (`AdminSiteSettingsView` mounts twenty). Publishing route-level chrome
   * from all of those by default would be wrong far more often than right.
   * The hook additionally suppresses itself inside an overlay, so passing
   * this in a modal is a no-op rather than a bug.
   */
  bottomBar?: FormBottomBarConfig;
  /** Cross-axis alignment of flex/grid children. Replaces raw `items-*` className. */
  align?: "start" | "center" | "end" | "stretch";
  /** Gap between children — use instead of raw `gap-*` className. */
  gap?: GapToken;
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
const FORM_ALIGN_MAP: Record<"start" | "center" | "end" | "stretch", string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

export interface FormBottomBarConfig {
  onSubmit: () => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

export function Form({ children, spacing, schema, shellCtx: shellCtxProp, bottomBar, align, gap, surface, padding, paddingX, paddingY, rounded, roundedTop, roundedBottom, border, shadow, overflow, className = "", ...props }: FormProps) {
  const helpers = useFormShellState(schema);
  const effectiveCtx = shellCtxProp ?? helpers.shellCtx;

  /*
   * Marking the attempt on the NATIVE submit event covers both shapes this
   * component is used in: the caller that calls `validate()` (which marks
   * anyway) and the caller that hand-rolls its checks in the submit button's
   * `onClick`. React fires `onClick` before `onSubmit`, so by the time the
   * re-render happens the errors are already in the context.
   *
   * `effectiveCtx` may come from a parent's `useFormShellState`, so mark on
   * whichever context is actually mounted — not on `helpers`, which is a
   * second, ignored state instance in that case.
   */
  const { onSubmit: onSubmitProp } = props;
  const handleSubmit = React.useCallback(
    (e: Parameters<NonNullable<typeof onSubmitProp>>[0]) => {
      effectiveCtx.markSubmitAttempted();
      onSubmitProp?.(e);
    },
    [effectiveCtx, onSubmitProp],
  );

  useFormBottomActions({
    onSubmit: bottomBar?.onSubmit ?? (() => {}),
    onCancel: bottomBar?.onCancel,
    submitLabel: bottomBar?.submitLabel,
    cancelLabel: bottomBar?.cancelLabel,
    isLoading: bottomBar?.isLoading,
    disabled: bottomBar?.disabled,
    enabled: bottomBar != null,
    ctx: effectiveCtx,
  });

  const content =
    typeof children === "function"
      ? (children as (h: UseFormShellStateResult) => React.ReactNode)({ ...helpers, shellCtx: effectiveCtx })
      : children;
  return (
    <FormShellContext.Provider value={effectiveCtx}>
      <form
        className={[
          "appkit-form",
          spacing ? FORM_SPACING_MAP[spacing] : "",
          align ? FORM_ALIGN_MAP[align] : "",
          gap ? GAP_MAP[gap] : "",
          buildSurfaceClasses({ surface, padding, paddingX, paddingY, rounded, roundedTop, roundedBottom, border, shadow, overflow }),
          className,
        ].filter(Boolean).join(" ")}
        {...props}
        onSubmit={handleSubmit}
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
