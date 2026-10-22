"use client";
import React from "react";
import { Div } from "./Div";
import { Label, Text } from "./Typography";

const CLS_INPUT_ERROR = "border-error focus-visible:border-error focus-visible:ring-error/20 dark:border-error";
const CLS_INPUT_SUCCESS_ICON = "h-4 w-4 text-success dark:text-success";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: React.ReactNode;
  helperText?: React.ReactNode;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  success?: boolean;
  bare?: boolean;
  variant?: "default" | "ghost" | "error";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      label,
      error,
      helperText,
      icon,
      rightIcon,
      success = false,
      bare = false,
      variant = "default",
      className = "",
      disabled,
      required,
      id,
      ...props
    },
    ref,
  ) {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    const variantClass =
      error || variant === "error"
        ? CLS_INPUT_ERROR
        : variant === "ghost"
          ? "border-transparent bg-transparent shadow-none"
          : "";

    /*
     * 🛑 A CALLER'S OWN `aria-invalid` MUST WIN — it did not, and that broke
     * every form in the app.
     *
     * `{...props}` is spread FIRST on both `<input>` elements below, so
     * re-specifying `aria-invalid={error ? "true" : undefined}` afterwards
     * OVERWROTE an incoming `"true"` with `undefined` (JSX: later wins).
     *
     * That is not hypothetical. `FieldInput` sets `aria-invalid` itself and
     * deliberately WITHHOLDS `error` from this component, so the message is not
     * rendered twice — which means `error` here is `undefined` exactly when the
     * field is invalid. Net effect: no `Field*`-built form ever emitted
     * `aria-invalid`, and `SectionForm`'s jump-to-error
     * (`querySelector("[aria-invalid='true']")?.focus()`) silently focused
     * nothing, every time.
     *
     * Same precedence rule as `bareAriaLabel` below: fill the gap, never
     * override an explicit choice.
     */
    const ariaInvalid = props["aria-invalid"] ?? (error ? "true" : undefined);

    const inputClassName = [
      "appkit-input",
      icon ? "pl-10" : "",
      rightIcon || success ? "pr-10" : "",
      disabled ? "cursor-not-allowed opacity-60" : "",
      variantClass,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    if (bare) {
      /*
       * 🛑 `bare` DROPPED THE LABEL, and four call sites pass one.
       *
       * This branch exists to render an `<input>` with no wrapper markup —
       * `/admin/site`'s native colour pickers need the element bare so the
       * swatch fills its box. But it also ignored `label` entirely, so
       * `<Input type="color" label="Overlay color" bare />` rendered an input
       * with NO accessible name while the call site plainly declared one.
       * A prop accepted and silently discarded (Root Cause #51's shape), and
       * it lands on exactly the page the audit measured.
       *
       * `aria-label` rather than a `<label>` element: adding a label here
       * would reintroduce the wrapper this branch exists to avoid. Only when
       * the label is a STRING — a ReactNode cannot become an attribute, and
       * stringifying one would produce "[object Object]" as the field's
       * accessible name, which is worse than none.
       *
       * A caller's own `aria-label` wins, so this fills a gap and never
       * overrides an explicit choice.
       */
      const bareAriaLabel =
        props["aria-label"] ?? (typeof label === "string" ? label : undefined);
      return (
        <input
          {...props}
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-label={bareAriaLabel}
          aria-invalid={ariaInvalid}
          className={inputClassName}
        />
      );
    }

    const adornment =
      rightIcon ??
      (success && !error ? (
        <svg
          className={CLS_INPUT_SUCCESS_ICON}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.415 0l-3.2-3.2a1 1 0 111.414-1.42l2.493 2.494 6.493-6.494a1 1 0 011.415 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : null);

    return (
      <div className="w-full" data-section="input-div-527">
        {label && (
          <Label htmlFor={inputId} required={required}>
            {label}
          </Label>
        )}

        <div className="relative" data-section="input-div-528">
          {icon && (
            <Div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--appkit-color-text-faint)]" data-section="input-div-529">
              {icon}
            </Div>
          )}

          <input
            {...props}
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={ariaInvalid}
            className={inputClassName}
          />

          {adornment && (
            <Div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--appkit-color-text-faint)]" data-section="input-div-530">
              {adornment}
            </Div>
          )}
        </div>

        {error ? (
          <Text size="sm" variant="error" className="mt-1.5" role="alert">
            {error}
          </Text>
        ) : helperText ? (
          <Text size="sm" variant="secondary" className="mt-1.5">
            {helperText}
          </Text>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
