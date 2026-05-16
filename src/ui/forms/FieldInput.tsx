"use client";
import React, { useContext } from "react";
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
  ...inputProps
}: FieldInputProps) {
  const ctx = useContext(FormShellContext);
  const contextError = ctx?.errors[name];
  const error = errorProp ?? contextError;
  const touched = ctx?.touched[name];
  const showError = !!error && (touched != null ? touched : true);

  const inputId = `field-${name}`;
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
