"use client";

import React from "react";
import { Label, Span, Text } from "./Typography";

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: React.ReactNode;
  error?: React.ReactNode;
  orientation?: "vertical" | "horizontal";
  variant?: "toggle" | "classic";
  required?: boolean;
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  label,
  error,
  orientation = "vertical",
  variant = "toggle",
  required = false,
}: RadioGroupProps) {
  const stackClass =
    orientation === "horizontal"
      ? "flex flex-wrap gap-2"
      : "flex flex-col gap-2";

  return (
    <div className="w-full">
      {label && (
        <Label className="mb-2 block" required={required}>
          {label}
        </Label>
      )}

      <div
        className={stackClass}
        role="radiogroup"
        aria-label={typeof label === "string" ? label : undefined}
      >
        {options.map((option) => {
          const selected = option.value === value;
          if (variant === "classic") {
            return (
              <Label
                key={option.value}
                className={[
                  "inline-flex items-center gap-3",
                  option.disabled
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="relative inline-flex h-5 w-5 items-center justify-center">
                  <input
                    type="radio"
                    name={name}
                    value={option.value}
                    checked={selected}
                    onChange={() => onChange?.(option.value)}
                    disabled={option.disabled}
                    className="peer sr-only"
                  />
                  <span
                    className={[
                      "h-5 w-5 rounded-full border transition",
                      selected
                        ? "border-lime-600 dark:border-pink-500"
                        : "border-zinc-300 dark:border-slate-600",
                      "peer-focus-visible:ring-2 peer-focus-visible:ring-lime-500/30 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-pink-500/30 dark:peer-focus-visible:ring-offset-slate-950",
                    ].join(" ")}
                  />
                  <span
                    className={[
                      "pointer-events-none absolute h-2.5 w-2.5 rounded-full transition",
                      selected
                        ? "scale-100 bg-lime-600 dark:bg-pink-500"
                        : "scale-0 bg-transparent",
                    ].join(" ")}
                  />
                </span>
                <Span className="text-sm text-zinc-700 dark:text-zinc-200">
                  {option.label}
                </Span>
              </Label>
            );
          }

          return (
            <label
              key={option.value}
              className={[
                "relative inline-flex",
                option.disabled
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange?.(option.value)}
                disabled={option.disabled}
                className="peer sr-only"
              />
              <span
                className={[
                  "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition",
                  selected
                    ? "border-lime-600 bg-lime-50 text-lime-900 dark:border-pink-500 dark:bg-pink-500/10 dark:text-pink-100"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-lime-500 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-200 dark:hover:border-pink-500",
                  error && !selected
                    ? "border-red-300 dark:border-red-500/60"
                    : "",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-lime-500/30 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-pink-500/30 dark:peer-focus-visible:ring-offset-slate-950",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span
                  className={[
                    "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border transition",
                    selected
                      ? "border-lime-600 bg-lime-600 dark:border-pink-500 dark:bg-pink-500"
                      : "border-zinc-300 dark:border-slate-600",
                  ].join(" ")}
                >
                  <span
                    className={
                      selected
                        ? "h-1.5 w-1.5 rounded-full bg-white dark:bg-slate-950"
                        : "hidden"
                    }
                  />
                </span>
                <Span>{option.label}</Span>
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <Text size="sm" variant="error" className="mt-1.5" role="alert">
          {error}
        </Text>
      )}
    </div>
  );
}
