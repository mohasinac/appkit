"use client";
import React from "react";
import { Div } from "./Div";
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
  /**
   * Render just the native `<select>` with its options — no Label/error
   * chrome. For call sites that already own their own label/wrapper markup.
   */
  bare?: boolean;
  /**
   * className applied to the outer wrapper div — the real flex/grid child
   * when this Select sits inside a Row/flex container. `className` only
   * reaches the inner `<select>` element, so sizing utilities like
   * `flex-shrink-0` / `min-w-*` / `max-w-*` must go here instead.
   */
  wrapperClassName?: string;
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
  bare = false,
  wrapperClassName,
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

  const selectClassName = [
    "appkit-select__trigger",
    "w-full appearance-none pr-10",
    disabled
      ? "appkit-select__trigger--disabled"
      : "appkit-select__trigger--enabled",
    variantClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const optionsMarkup = (
    <>
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
    </>
  );

  if (bare) {
    return (
      <select
        {...props}
        id={inputId}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        aria-invalid={error ? "true" : undefined}
        className={selectClassName}
      >
        {optionsMarkup}
      </select>
    );
  }

  return (
    <div className={["appkit-select", wrapperClassName].filter(Boolean).join(" ")} data-section="select-div-592">
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
          className={selectClassName}
        >
          {optionsMarkup}
        </select>

        <Div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--appkit-color-text-faint)]" data-section="select-div-594">
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
        </Div>
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
