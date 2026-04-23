import React from "react";
import { Label, Text } from "./Typography";

export interface SelectOption<V = string> {
  label: string;
  value: V;
  disabled?: boolean;
}

export interface SelectProps<V extends string = string> extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "onChange"
> {
  options: SelectOption<V>[];
  value?: V;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  onValueChange?: (value: V) => void;
  placeholder?: string;
  label?: React.ReactNode;
  error?: React.ReactNode;
  helperText?: React.ReactNode;
  required?: boolean;
  variant?: "default" | "ghost" | "error";
}

export function Select<V extends string = string>({
  options,
  value,
  onChange,
  onValueChange,
  placeholder,
  label,
  error,
  helperText,
  disabled = false,
  required,
  className = "",
  id,
  variant = "default",
  ...props
}: SelectProps<V>) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    onChange?.(event);
    onValueChange?.(event.target.value as V);
  };

  const variantClass =
    error || variant === "error"
      ? "appkit-select__trigger--error"
      : variant === "ghost"
        ? "border-transparent bg-transparent shadow-none"
        : "appkit-select__trigger--default";

  return (
    <div className="appkit-select" data-section="select-div-592">
      {label && (
        <Label
          htmlFor={inputId}
          className="appkit-select__label"
          required={required}
        >
          {label}
        </Label>
      )}

      <div className="relative group" data-section="select-div-593">
        <select
          {...props}
          id={inputId}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          aria-invalid={error ? "true" : undefined}
          className={[
            "appkit-select__trigger",
            "w-full appearance-none pr-10",
            disabled
              ? "appkit-select__trigger--disabled"
              : "appkit-select__trigger--enabled",
            variantClass,
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option
              key={String(option.value)}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-400 dark:text-zinc-500" data-section="select-div-594">
          <svg
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {error ? (
        <Text
          size="sm"
          variant="error"
          className="appkit-select__error"
          role="alert"
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text size="sm" variant="secondary" className="appkit-select__error">
          {helperText}
        </Text>
      ) : null}
    </div>
  );
}
