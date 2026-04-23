import React from "react";
import { Label, Text } from "./Typography";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  error?: React.ReactNode;
  helperText?: React.ReactNode;
  showCharCount?: boolean;
  variant?: "default" | "ghost" | "error";
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      label,
      error,
      helperText,
      showCharCount = false,
      variant = "default",
      className = "",
      required,
      maxLength,
      value,
      defaultValue,
      id,
      ...props
    },
    ref,
  ) {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const charCount =
      typeof value === "string"
        ? value.length
        : typeof defaultValue === "string"
          ? defaultValue.length
          : 0;

    const variantClass =
      error || variant === "error"
        ? "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/20 dark:border-red-500"
        : variant === "ghost"
          ? "border-transparent bg-transparent shadow-none"
          : "";

    return (
      <div className="w-full" data-section="textarea-div-620">
        {label && (
          <Label htmlFor={inputId} required={required}>
            {label}
          </Label>
        )}

        <textarea
          {...props}
          ref={ref}
          id={inputId}
          value={value}
          defaultValue={defaultValue}
          maxLength={maxLength}
          aria-invalid={error ? "true" : undefined}
          className={["appkit-textarea", variantClass, className]
            .filter(Boolean)
            .join(" ")}
        />

        {(error || helperText || (showCharCount && maxLength)) && (
          <div className="mt-1.5 flex items-start justify-between gap-3" data-section="textarea-div-621">
            <div className="min-w-0 flex-1" data-section="textarea-div-622">
              {error ? (
                <Text size="sm" variant="error" role="alert">
                  {error}
                </Text>
              ) : helperText ? (
                <Text size="sm" variant="secondary">
                  {helperText}
                </Text>
              ) : null}
            </div>

            {showCharCount && maxLength ? (
              <Text
                size="xs"
                variant={charCount >= maxLength ? "error" : "muted"}
                className="shrink-0 tabular-nums"
              >
                {charCount}/{maxLength}
              </Text>
            ) : null}
          </div>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
