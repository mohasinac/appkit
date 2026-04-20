import React from "react";
import { Div, Span } from "../../ui";
import { cn, LABEL_BASE, ERROR_BASE } from "./utils";

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
  label?: string;
  error?: string;
  orientation?: "vertical" | "horizontal";
  /** Visual style: "toggle" = pill selectors, "classic" = dot-style */
  variant?: "toggle" | "classic";
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
}: RadioGroupProps) {
  if (variant === "classic") {
    return (
      <Div className="w-full">
        {label && <p className={LABEL_BASE}>{label}</p>}
        <Div
          className={cn(
            "flex gap-3",
            orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
          )}
        >
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  "flex items-center gap-2.5 cursor-pointer",
                  option.disabled && "opacity-50 cursor-not-allowed",
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={isSelected}
                  disabled={option.disabled}
                  onChange={() => !option.disabled && onChange?.(option.value)}
                  className="w-4 h-4 text-primary-600 dark:text-secondary-500 border-zinc-300 dark:border-slate-600 focus:ring-primary-500/30 dark:focus:ring-secondary-400/30"
                />
                <Span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {option.label}
                </Span>
              </label>
            );
          })}
        </Div>
        {error && (
          <p className={ERROR_BASE} role="alert">
            {error}
          </p>
        )}
      </Div>
    );
  }

  // Toggle variant — pill style
  return (
    <Div className="w-full">
      {label && <p className={LABEL_BASE}>{label}</p>}
      <Div
        className={cn(
          "flex gap-2",
          orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
        )}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex items-center justify-center px-4 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all duration-200",
                isSelected
                  ? "bg-primary-600 dark:bg-secondary-500 border-primary-600 dark:border-secondary-500 text-white shadow-sm"
                  : "border-zinc-200 dark:border-slate-700 text-zinc-700 dark:text-zinc-300 hover:border-primary-400 dark:hover:border-secondary-400 hover:bg-primary-50/50 dark:hover:bg-secondary-900/20",
                option.disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                disabled={option.disabled}
                onChange={() => !option.disabled && onChange?.(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </Div>
      {error && (
        <p className={ERROR_BASE} role="alert">
          {error}
        </p>
      )}
    </Div>
  );
}
