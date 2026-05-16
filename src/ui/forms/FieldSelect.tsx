"use client";
import React, { useContext } from "react";
import { FormShellContext } from "./FormShell";
import { Select, type SelectOption } from "../components/Select";
import { Label, Text, Span } from "../components/Typography";

export interface FieldSelectProps {
  name: string;
  label?: string;
  hint?: string;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  options: SelectOption[];
  disabled?: boolean;
  placeholder?: string;
  /** Override error — falls back to FormShell context error for this field */
  error?: string;
  className?: string;
}

export function FieldSelect({
  name,
  label,
  hint,
  required,
  value,
  onChange,
  onBlur,
  options,
  disabled,
  placeholder,
  error: errorProp,
  className,
}: FieldSelectProps) {
  const ctx = useContext(FormShellContext);
  const contextError = ctx?.errors[name];
  const error = errorProp ?? contextError;
  const touched = ctx?.touched[name];
  const showError = !!error && (touched != null ? touched : true);

  const inputId = `field-${name}`;
  const errorId = `${inputId}-error`;

  function handleBlur() {
    ctx?.setFieldTouched(name);
    onBlur?.();
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
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
      <Select
        id={inputId}
        name={name}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        options={options}
        disabled={disabled}
        placeholder={placeholder}
        aria-required={required || undefined}
        aria-invalid={showError || undefined}
        aria-describedby={showError ? errorId : undefined}
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
