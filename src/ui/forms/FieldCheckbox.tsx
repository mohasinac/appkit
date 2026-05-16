"use client";
import React, { useContext } from "react";
import { FormShellContext } from "./FormShell";
import { Checkbox } from "../components/Checkbox";
import { Text } from "../components/Typography";

export interface FieldCheckboxProps {
  name: string;
  label: string;
  hint?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  onBlur?: () => void;
  disabled?: boolean;
  /** Override error — falls back to FormShell context error for this field */
  error?: string;
  className?: string;
}

export function FieldCheckbox({
  name,
  label,
  hint,
  checked,
  onChange,
  onBlur,
  disabled,
  error: errorProp,
  className,
}: FieldCheckboxProps) {
  const ctx = useContext(FormShellContext);
  const contextError = ctx?.errors[name];
  const error = errorProp ?? contextError;
  const touched = ctx?.touched[name];
  const showError = !!error && (touched != null ? touched : true);

  const inputId = `field-${name}`;
  const errorId = `${inputId}-error`;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange?.(e.target.checked);
    if (showError) ctx?.clearFieldError(name);
  }

  function handleBlur() {
    ctx?.setFieldTouched(name);
    onBlur?.();
  }

  return (
    <div className={["appkit-form-field", className].filter(Boolean).join(" ")}>
      <Checkbox
        id={inputId}
        name={name}
        checked={checked}
        onChange={handleChange}
        onBlur={handleBlur}
        label={label}
        disabled={disabled}
        error={showError ? error : undefined}
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
