"use client"
import React from "react";
import { Label, Span, Text } from "./Typography";

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: React.ReactNode;
  suffix?: React.ReactNode;
  error?: React.ReactNode;
  indeterminate?: boolean;
  /** Override the native input type — for a checkbox-shaped control driven by radio semantics (e.g. a poll option list toggling between multi/single-select). Defaults to `"checkbox"`. */
  type?: "checkbox" | "radio";
  /**
   * Render just the native input with no Label/box/icon chrome — for
   * call sites that already own their own custom option-card markup
   * (border, padding, hover state) and just need the underlying control.
   */
  bare?: boolean;
  /**
   * Classes for the OUTER wrapper `<div>` — the element that is the real flex
   * child when this checkbox sits inside a `<Row>`/flex container. `className`
   * only ever reaches the inner `<input>`, so sizing/flex utilities passed
   * there are silently inert (Recurrent Root Cause #29 — same defect `Select`
   * ships `wrapperClassName` for). Use this for `flex-shrink-0`, `min-w-*`,
   * margins, alignment — anything positioning the control within its parent.
   */
  wrapperClassName?: string;
}

const UI_CHECKBOX_INLINE = "appkit-checkbox--inline";

const UI_CHECKBOX = {
  base: "appkit-checkbox",
  label: "appkit-checkbox__label",
  labelDisabled: "appkit-checkbox__label--disabled",
  boxWrap: "appkit-checkbox__box-wrap",
  input: "appkit-checkbox__input",
  inputError: "appkit-checkbox__input--error",
  icon: "appkit-checkbox__icon",
  content: "appkit-checkbox__content",
  text: "appkit-checkbox__text",
  error: "appkit-checkbox__error",
} as const;

export function Checkbox({
  label,
  suffix,
  error,
  indeterminate = false,
  type = "checkbox",
  bare = false,
  className = "",
  wrapperClassName = "",
  checked,
  disabled,
  id,
  ...props
}: CheckboxProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  if (bare) {
    return (
      <input
        {...props}
        ref={inputRef}
        id={inputId}
        type={type}
        checked={checked}
        disabled={disabled}
        aria-invalid={error ? "true" : undefined}
        className={className}
      />
    );
  }

  // A checkbox with no label/suffix has no text to lay out beside the box, so
  // the default `width: 100%` on the root serves no purpose and actively harms
  // it: as a flex child it claims the whole row and squeezes its siblings to
  // zero. `--inline` makes it size to its content instead.
  const isInline = !label && !suffix;

  return (
    <div
      className={[
        UI_CHECKBOX.base,
        isInline ? UI_CHECKBOX_INLINE : "",
        wrapperClassName,
      ]
        .filter(Boolean)
        .join(" ")}
      data-section="checkbox-div-467"
    >
      <Label
        htmlFor={inputId}
        className={[
          UI_CHECKBOX.label,
          disabled ? UI_CHECKBOX.labelDisabled : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className={UI_CHECKBOX.boxWrap}>
          <input
            {...props}
            ref={inputRef}
            id={inputId}
            type={type}
            checked={checked}
            disabled={disabled}
            aria-invalid={error ? "true" : undefined}
            className={[
              UI_CHECKBOX.input,
              error ? UI_CHECKBOX.inputError : "",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className={UI_CHECKBOX.icon}
          >
            {indeterminate ? (
              <path
                d="M5 10h10"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
            ) : (
              <path
                d="M5 10.5 8.2 13.5 15 6.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
            )}
          </svg>
        </span>

        {(label || suffix) && (
          <span className={UI_CHECKBOX.content}>
            {label ? (
              <Span className={UI_CHECKBOX.text}>{label}</Span>
            ) : (
              <span />
            )}
            {suffix}
          </span>
        )}
      </Label>

      {error && (
        <Text
          size="sm"
          variant="error"
          className={UI_CHECKBOX.error}
          role="alert"
        >
          {error}
        </Text>
      )}
    </div>
  );
}
