import React from "react";
import { Label, Text } from "./Typography";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: React.ReactNode;
  helperText?: React.ReactNode;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  success?: boolean;
  bare?: boolean;
  variant?: "default" | "ghost" | "error";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      label,
      error,
      helperText,
      icon,
      rightIcon,
      success = false,
      bare = false,
      variant = "default",
      className = "",
      disabled,
      required,
      id,
      ...props
    },
    ref,
  ) {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    const variantClass =
      error || variant === "error"
        ? "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/20 dark:border-red-500"
        : variant === "ghost"
          ? "border-transparent bg-transparent shadow-none"
          : "";

    const inputClassName = [
      "appkit-input",
      icon ? "pl-10" : "",
      rightIcon || success ? "pr-10" : "",
      disabled ? "cursor-not-allowed opacity-60" : "",
      variantClass,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    if (bare) {
      return (
        <input
          {...props}
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? "true" : undefined}
          className={inputClassName}
        />
      );
    }

    const adornment =
      rightIcon ??
      (success && !error ? (
        <svg
          className="h-4 w-4 text-green-600 dark:text-green-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.415 0l-3.2-3.2a1 1 0 111.414-1.42l2.493 2.494 6.493-6.494a1 1 0 011.415 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : null);

    return (
      <div className="w-full" data-section="input-div-527">
        {label && (
          <Label htmlFor={inputId} required={required}>
            {label}
          </Label>
        )}

        <div className="relative" data-section="input-div-528">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400 dark:text-zinc-500" data-section="input-div-529">
              {icon}
            </div>
          )}

          <input
            {...props}
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={error ? "true" : undefined}
            className={inputClassName}
          />

          {adornment && (
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-400 dark:text-zinc-500" data-section="input-div-530">
              {adornment}
            </div>
          )}
        </div>

        {error ? (
          <Text size="sm" variant="error" className="mt-1.5" role="alert">
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

Input.displayName = "Input";
