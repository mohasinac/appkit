import React from "react";
import { Div, Span } from "@mohasinac/ui";
import {
  cn,
  INPUT_BASE,
  INPUT_ERROR,
  INPUT_SUCCESS,
  INPUT_DISABLED,
  INPUT_WITH_ICON,
  LABEL_BASE,
  HELPER_BASE,
  ERROR_BASE,
} from "./utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  success?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      label,
      error,
      helperText,
      icon,
      rightIcon,
      success,
      className = "",
      required,
      disabled,
      ...props
    },
    ref,
  ) {
    const stateClasses = error
      ? INPUT_ERROR
      : success
        ? INPUT_SUCCESS
        : disabled
          ? INPUT_DISABLED
          : "";

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
          {icon && (
            <Div
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-150",
                error
                  ? "text-red-600 dark:text-red-400"
                  : "text-zinc-400 dark:text-zinc-500",
                "group-focus-within:text-primary-500 dark:group-focus-within:text-secondary-400",
              )}
            >
              {icon}
            </Div>
          )}

          <input
            ref={ref}
            className={cn(
              "w-full",
              INPUT_BASE,
              icon ? INPUT_WITH_ICON : "",
              rightIcon ? "pr-10" : "",
              stateClasses,
              className,
            )}
            disabled={disabled}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={
              error
                ? `${props.id}-error`
                : helperText
                  ? `${props.id}-helper`
                  : undefined
            }
            {...props}
          />

          {rightIcon && (
            <Div
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150",
                error
                  ? "text-red-600 dark:text-red-400"
                  : "text-zinc-400 dark:text-zinc-500",
              )}
            >
              {rightIcon}
            </Div>
          )}
        </Div>

        {error && (
          <p id={`${props.id}-error`} className={ERROR_BASE} role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${props.id}-helper`} className={HELPER_BASE}>
            {helperText}
          </p>
        )}
      </Div>
    );
  },
);

Input.displayName = "Input";
