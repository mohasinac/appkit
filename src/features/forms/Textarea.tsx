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

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCharCount?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      label,
      error,
      helperText,
      showCharCount,
      className = "",
      required,
      maxLength,
      value,
      defaultValue,
      ...props
    },
    ref,
  ) {
    const charCount =
      typeof value === "string"
        ? value.length
        : typeof defaultValue === "string"
          ? defaultValue.length
          : 0;

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

        <textarea
          ref={ref}
          className={cn(
            INPUT_BASE,
            "resize-y min-h-[80px]",
            error ? INPUT_ERROR : "",
            className,
          )}
          aria-invalid={error ? "true" : undefined}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          {...props}
        />

        <Div className="flex items-center justify-between mt-1.5">
          <Div className="flex-1">
            {error && (
              <p className={ERROR_BASE} role="alert">
                {error}
              </p>
            )}
            {!error && helperText && (
              <p className={HELPER_BASE}>{helperText}</p>
            )}
          </Div>
          {showCharCount && maxLength && (
            <p
              className={cn(
                "text-xs tabular-nums ml-2 flex-shrink-0",
                charCount >= maxLength
                  ? "text-red-500 dark:text-red-400"
                  : "text-zinc-400 dark:text-zinc-500",
              )}
            >
              {charCount} / {maxLength}
            </p>
          )}
        </Div>
      </Div>
    );
  },
);

Textarea.displayName = "Textarea";
