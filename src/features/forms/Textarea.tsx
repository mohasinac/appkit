import React from "react";
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
      <div className="w-full">
        {label && (
          <label className={LABEL_BASE}>
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-hidden="true">
                *
              </span>
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

        <div className="flex items-center justify-between mt-1.5">
          <div className="flex-1">
            {error && (
              <p className={ERROR_BASE} role="alert">
                {error}
              </p>
            )}
            {!error && helperText && (
              <p className={HELPER_BASE}>{helperText}</p>
            )}
          </div>
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
        </div>
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
