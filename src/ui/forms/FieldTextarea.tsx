"use client";
import React, { useContext } from "react";
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

  const fieldId = `field-${name}`;
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
