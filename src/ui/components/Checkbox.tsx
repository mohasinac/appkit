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
}

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
  className = "",
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

  return (
    <div className={UI_CHECKBOX.base} data-section="checkbox-div-467">
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
            type="checkbox"
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
