"use client";
import React, { useContext, useId } from "react";
import { FormShellContext } from "./FormShell";
import { Input } from "../components/Input";
import { Label, Text, Span } from "../components/Typography";

export interface FieldInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  name: string;
  label?: string;
  hint?: string;
  required?: boolean;
  onChange?: (value: string) => void;
  /** Override error — falls back to FormShell context error for this field */
  error?: string;
  /**
   * A ref to the inner `<input>`, for the cases that need programmatic focus:
   * a scan station that must re-focus after every scan, an error summary that
   * jumps to the offending field, a drawer that focuses its first control.
   *
   * 🛑 NAMED `inputRef`, not a `forwardRef` on the component. This renders a
   * wrapper `<div>`, a `<Label>`, the `<input>` and an error `<Text>` — so a
   * bare "the ref" has no single obvious target, and the next reader could
   * reasonably expect the wrapper. Being explicit about which element is the
   * same lesson as `Select`'s `wrapperClassName` (Root Cause #29): when a
   * primitive has an outer box and an inner control, a prop that does not say
   * which one it means will eventually reach the wrong one.
   */
  inputRef?: React.Ref<HTMLInputElement>;
}

export function FieldInput({
  name,
  label,
  hint,
  required,
  onChange,
  error: errorProp,
  onBlur,
  className,
  inputRef,
  ...inputProps
}: FieldInputProps) {
  const ctx = useContext(FormShellContext);
  const contextError = ctx?.errors[name];
  const error = errorProp ?? contextError;
  const touched = ctx?.touched[name];
  const showError = !!error && (touched != null ? touched : true);

  const reactId = useId();
  /*
   * 🛑 UNIQUE PER INSTANCE. This was `field-${name}`, so two fields sharing a
   * name on one page produced two elements with the SAME id — `/auth/login`
   * shipped two `id="field-email"` (the sign-in form and the footer
   * newsletter).
   *
   * That is not cosmetic. `htmlFor` resolves to the FIRST element with the
   * id, so the second field's label points at the first field's input: the
   * label is present in the markup and the input has no accessible name, which
   * is what an accessibility pass reports as an unlabelled field. Clicking the
   * second label also focuses the first input.
   */
  const inputId = `field-${name}-${reactId}`;
  const errorId = `${inputId}-error`;

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    ctx?.setFieldTouched(name);
    onBlur?.(e);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange?.(e.target.value);
    if (showError) ctx?.clearFieldError(name);
  }

  return (
    <div className={["appkit-form-field", className].filter(Boolean).join(" ")}>
      {label && (
        <Label htmlFor={inputId} className="appkit-form-field__label">
          {label}
          {required && <Span className="appkit-form-field__required"> *</Span>}
        </Label>
      )}
      <Input
        ref={inputRef}
        id={inputId}
        name={name}
        aria-required={required || undefined}
        aria-invalid={showError || undefined}
        aria-describedby={showError ? errorId : undefined}
        onBlur={handleBlur}
        onChange={handleChange}
        {...inputProps}
      />
      {!showError && hint && (
        <Text size="sm" variant="secondary" className="appkit-form-field__hint">
          {hint}
        </Text>
      )}
      {showError && (
        <Text
          id={errorId}
          size="sm"
          variant="error"
          className="appkit-form-field__error"
          role="alert"
        >
          {error}
        </Text>
      )}
    </div>
  );
}
