import React from "react";
import { Label, Text } from "./Typography";

export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label?: React.ReactNode;
  error?: React.ReactNode;
  helperText?: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  function DateInput({ label, error, helperText, value, onChange, disabled, required, id, className = "", ...props }, ref) {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <div className="w-full">
        {label && (
          <Label htmlFor={inputId} required={required} className="appkit-form-field__label mb-1.5">
            {label}
          </Label>
        )}
        <input
          {...props}
          ref={ref}
          id={inputId}
          type="date"
          value={value}
          disabled={disabled}
          required={required}
          aria-invalid={error ? "true" : undefined}
          onChange={(e) => onChange?.(e.target.value)}
          className={["appkit-input", error ? "appkit-input--error" : "", className].filter(Boolean).join(" ")}
        />
        {error ? (
          <Text size="sm" variant="error" role="alert" className="mt-1.5">
            {error}
          </Text>
        ) : helperText ? (
          <Text size="sm" variant="secondary" className="mt-1.5">
            {helperText}
          </Text>
        ) : null}
      </div>
    );
  },
);

export interface DateRangeInputProps {
  label?: React.ReactNode;
  startLabel?: string;
  endLabel?: string;
  startValue?: string;
  endValue?: string;
  onStartChange?: (value: string) => void;
  onEndChange?: (value: string) => void;
  error?: React.ReactNode;
  helperText?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  startMin?: string;
  startMax?: string;
  endMin?: string;
  endMax?: string;
}

export function DateRangeInput({
  label,
  startLabel = "From",
  endLabel = "To",
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  error,
  helperText,
  disabled,
  required,
  startMin,
  startMax,
  endMin,
  endMax,
}: DateRangeInputProps) {
  return (
    <div className="w-full">
      {label && (
        <Text size="sm" className="appkit-form-field__label mb-1.5 block font-medium">
          {label}
        </Text>
      )}
      <div className="flex items-end gap-2">
        <DateInput
          label={startLabel}
          value={startValue}
          onChange={onStartChange}
          disabled={disabled}
          required={required}
          min={startMin}
          max={startMax ?? endValue}
        />
        <span className="mb-2.5 shrink-0 text-sm text-[var(--appkit-color-text-muted)]">–</span>
        <DateInput
          label={endLabel}
          value={endValue}
          onChange={onEndChange}
          disabled={disabled}
          min={endMin ?? startValue}
          max={endMax}
        />
      </div>
      {error ? (
        <Text size="sm" variant="error" role="alert" className="mt-1.5">
          {error}
        </Text>
      ) : helperText ? (
        <Text size="sm" variant="secondary" className="mt-1.5">
          {helperText}
        </Text>
      ) : null}
    </div>
  );
}
