"use client";

import React from "react";
import { Label, Span, Text } from "./Typography";

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: React.ReactNode;
  suffix?: React.ReactNode;
  error?: React.ReactNode;
  indeterminate?: boolean;
}

export function Checkbox({
  label,
  suffix,
  error,
  indeterminate = false,
  className = "",
  checked,
  disabled,
  id,
  ...props
}: CheckboxProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <div className="w-full">
      <Label
        htmlFor={inputId}
        className={[
          "inline-flex w-full cursor-pointer items-start gap-3",
          disabled ? "cursor-not-allowed opacity-60" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="relative mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            {...props}
            ref={inputRef}
            id={inputId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            aria-invalid={error ? "true" : undefined}
            className={[
              "peer h-5 w-5 appearance-none rounded-md border border-zinc-300 bg-white transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/30 focus-visible:ring-offset-2",
              "dark:border-slate-600 dark:bg-slate-900 dark:focus-visible:ring-pink-500/30 dark:focus-visible:ring-offset-slate-950",
              error ? "border-red-400 dark:border-red-500" : "",
              disabled
                ? "cursor-not-allowed"
                : "cursor-pointer hover:border-lime-500 dark:hover:border-pink-500",
              checked
                ? "border-lime-600 bg-lime-600 dark:border-pink-500 dark:bg-pink-500"
                : "",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 transition peer-checked:opacity-100"
          >
            {indeterminate ? (
              <path
                d="M5 10h10"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
            ) : (
              <path
                d="M5 10.5 8.2 13.5 15 6.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
            )}
          </svg>
        </span>

        {(label || suffix) && (
          <span className="flex min-w-0 flex-1 items-start justify-between gap-3">
            {label ? (
              <Span className="pt-0.5 text-sm text-zinc-700 dark:text-zinc-200">
                {label}
              </Span>
            ) : (
              <span />
            )}
            {suffix}
          </span>
        )}
      </Label>

      {error && (
        <Text size="sm" variant="error" className="mt-1.5 pl-8" role="alert">
          {error}
        </Text>
      )}
    </div>
  );
}
