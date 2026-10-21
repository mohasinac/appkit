"use client";
import React, { useContext, useId } from "react";
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
        // Never forward `error` to Checkbox — it renders its own error Text
        // block whenever `error` is truthy, and this component already
        // renders its own below. Passing both duplicated the message (and
        // the role="alert" announcement) — FieldInput/FieldTextarea/
        // FieldSelect all withhold `error` from their underlying primitive
        // for exactly this reason.
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
