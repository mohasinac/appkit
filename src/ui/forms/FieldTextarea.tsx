"use client";
import React, { useContext, useId } from "react";
import { FormShellContext } from "./FormShell";
import { Textarea } from "../components/Textarea";
import { Label, Text, Span } from "../components/Typography";

export interface FieldTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  name: string;
  label?: string;
  hint?: string;
  required?: boolean;
  onChange?: (value: string) => void;
  /** Override error — falls back to FormShell context error for this field */
  error?: string;
  /** Show a `{n}/{maxLength}` counter when maxLength is set */
  showCharCount?: boolean;
}

export function FieldTextarea({
  name,
  label,
  hint,
  required,
  onChange,
  error: errorProp,
  onBlur,
  className,
  showCharCount,
  ...textareaProps
}: FieldTextareaProps) {
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
  const fieldId = `field-${name}-${reactId}`;
  const errorId = `${fieldId}-error`;

  function handleBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    ctx?.setFieldTouched(name);
    onBlur?.(e);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange?.(e.target.value);
    if (showError) ctx?.clearFieldError(name);
  }

  return (
    <div className={["appkit-form-field", className].filter(Boolean).join(" ")}>
      {label && (
        <Label htmlFor={fieldId} className="appkit-form-field__label">
          {label}
          {required && <Span className="appkit-form-field__required"> *</Span>}
        </Label>
      )}
      <Textarea
        id={fieldId}
        name={name}
        aria-required={required || undefined}
        aria-invalid={showError || undefined}
        aria-describedby={showError ? errorId : undefined}
        onBlur={handleBlur}
        onChange={handleChange}
        showCharCount={showCharCount}
        {...textareaProps}
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
