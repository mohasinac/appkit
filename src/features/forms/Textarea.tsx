import React from "react";
import { Div, Row, Span, Text } from "../../ui";
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
              <Span className="text-error ml-1" aria-hidden="true">
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

        <Row className="mt-1.5" align="center" justify="between">
          <Div className="flex-1">
            {error && (
              <Text className={ERROR_BASE} role="alert">
                {error}
              </Text>
            )}
            {!error && helperText && (
              <Text className={HELPER_BASE}>{helperText}</Text>
            )}
          </Div>
          {showCharCount && maxLength && (
            <p
              className={cn(
                "text-xs tabular-nums ml-2 flex-shrink-0",
                charCount >= maxLength
                  ? "text-error"
                  : "text-zinc-400 dark:text-zinc-400",
              )}
            >
              {charCount} / {maxLength}
            </p>
          )}
        </Row>
      </Div>
    );
  },
);

Textarea.displayName = "Textarea";
