import React from "react";
import { Div, Span, Text } from "../../ui";
import { Select as UiSelect } from "../../ui/components/Select";
import {
  cn,
  INPUT_BASE,
  INPUT_ERROR,
  LABEL_BASE,
  HELPER_BASE,
  ERROR_BASE,
} from "./utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  helperText,
  options,
  placeholder,
  className = "",
  required,
  value,
  ...props
}: SelectProps) {
  return (
    <Div className="w-full">
      {label && (
        <label className={LABEL_BASE}>
          {label}
          {required && (
            <Span className="text-error ml-1" aria-hidden="true">
              *
            </Span>
          )}
        </label>
      )}

      <Div className="relative group">
        <UiSelect
          bare
          options={options}
          placeholder={placeholder}
          value={typeof value === "string" ? value : undefined}
          className={cn(
            INPUT_BASE,
            "pr-10 appearance-none cursor-pointer",
            error ? INPUT_ERROR : "",
            className,
          )}
          aria-invalid={error ? "true" : undefined}
          {...props}
        />

        {/* Chevron icon */}
        <Div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-150">
          <svg
            className={cn(
              "w-5 h-5 transition-transform duration-200",
              error
                ? "text-error"
                : "text-[var(--appkit-color-text-faint)]",
            )}
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
      </Div>

      {error && (
        <Text className={ERROR_BASE} role="alert">
          {error}
        </Text>
      )}
      {!error && helperText && <Text className={HELPER_BASE}>{helperText}</Text>}
    </Div>
  );
}
