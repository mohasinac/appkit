import React from "react";
import { Div, Span } from "../../ui";
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
  ...props
}: SelectProps) {
  return (
    <Div className="w-full">
      {label && (
        <label className={LABEL_BASE}>
          {label}
          {required && (
            <Span className="text-red-500 ml-1" aria-hidden="true">
              *
            </Span>
          )}
        </label>
      )}

      <Div className="relative group">
        <select
          className={cn(
            INPUT_BASE,
            "pr-10 appearance-none cursor-pointer",
            error ? INPUT_ERROR : "",
            className,
          )}
          aria-invalid={error ? "true" : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Chevron icon */}
        <Div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-150">
          <svg
            className={cn(
              "w-5 h-5 transition-transform duration-200",
              error
                ? "text-red-500 dark:text-red-400"
                : "text-zinc-400 dark:text-zinc-500",
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
        <p className={ERROR_BASE} role="alert">
          {error}
        </p>
      )}
      {!error && helperText && <p className={HELPER_BASE}>{helperText}</p>}
    </Div>
  );
}
