"use client";
import React, { useContext } from "react";
import { FormShellContext } from "./FormShell";
import { Label, Text, Span } from "../components/Typography";

export interface ColorPickerFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  name: string;
  label?: string;
  hint?: string;
  required?: boolean;
  /** Optional swatch width — defaults to full container (w-full). Accepts any Tailwind width class. */
  swatchWidth?: "full" | "32" | "24" | "16";
  onChange?: (value: string) => void;
  /** Override error — falls back to FormShell context error for this field */
  error?: string;
}

const SWATCH_WIDTH_MAP: Record<NonNullable<ColorPickerFieldProps["swatchWidth"]>, string> = {
  full: "w-full",
  "32": "w-32",
  "24": "w-24",
  "16": "w-16",
};

/**
 * Native `<input type="color">` wrapped in the FormShell error-aware contract.
 * Use for theme primary/secondary/accent picking + announcement banner colour.
 *
 * Example:
 *   <ColorPickerField name="primaryColor" label="Primary" value={primary}
 *                     onChange={setPrimary} />
 */
export function ColorPickerField({
  name,
  label,
  hint,
  required,
  swatchWidth = "full",
  onChange,
  error: errorProp,
  onBlur,
  className,
  ...inputProps
}: ColorPickerFieldProps) {
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
  }

  return (
    <Span layout="flex" gap="sm" className="flex-col">
      {label != null && (
        <Label htmlFor={inputId} required={required}>
          {label}
        </Label>
      )}
      <input
        id={inputId}
        type="color"
        name={name}
        className={`h-10 ${SWATCH_WIDTH_MAP[swatchWidth]} rounded border border-[var(--appkit-color-border)] cursor-pointer ${className ?? ""}`}
        aria-invalid={showError ? true : undefined}
        aria-describedby={showError ? errorId : undefined}
        onBlur={handleBlur}
        onChange={handleChange}
        {...inputProps}
      />
      {hint != null && !showError && (
        <Text size="xs" color="muted">{hint}</Text>
      )}
      {showError && (
        <Text id={errorId} role="alert" size="xs" color="error">
          {error}
        </Text>
      )}
    </Span>
  );
}
