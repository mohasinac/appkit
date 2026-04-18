"use client";

import React from "react";
import { Label, Span, Text } from "./Typography";

const UI_RADIO = {
  group: "appkit-radio-group",
  stack: {
    vertical: "appkit-radio-group__stack--vertical",
    horizontal: "appkit-radio-group__stack--horizontal",
  },
  classic: {
    base: "appkit-radio-classic",
    disabled: "appkit-radio-classic--disabled",
    indicator: "appkit-radio-classic__indicator",
    circle: "appkit-radio-classic__circle",
    circleSelected: "appkit-radio-classic__circle--selected",
    dot: "appkit-radio-classic__dot",
    dotSelected: "appkit-radio-classic__dot--selected",
  },
  toggle: {
    base: "appkit-radio-toggle",
    disabled: "appkit-radio-toggle--disabled",
    pill: "appkit-radio-toggle__pill",
    pillSelected: "appkit-radio-toggle__pill--selected",
    pillError: "appkit-radio-toggle__pill--error",
    dotRing: "appkit-radio-toggle__dot-ring",
    dotRingSelected: "appkit-radio-toggle__dot-ring--selected",
    dotInner: "appkit-radio-toggle__dot-inner",
  },
} as const;

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
  const stackClass = UI_RADIO.stack[orientation];

  return (
    <div className={UI_RADIO.group}>
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
                  UI_RADIO.classic.base,
                  option.disabled ? UI_RADIO.classic.disabled : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className={UI_RADIO.classic.indicator}>
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
                      UI_RADIO.classic.circle,
                      selected ? UI_RADIO.classic.circleSelected : "",
                    ].join(" ")}
                  />
                  <span
                    className={[
                      UI_RADIO.classic.dot,
                      selected ? UI_RADIO.classic.dotSelected : "",
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
                UI_RADIO.toggle.base,
                option.disabled ? UI_RADIO.toggle.disabled : "",
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
                  UI_RADIO.toggle.pill,
                  selected ? UI_RADIO.toggle.pillSelected : "",
                  error && !selected ? UI_RADIO.toggle.pillError : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span
                  className={[
                    UI_RADIO.toggle.dotRing,
                    selected ? UI_RADIO.toggle.dotRingSelected : "",
                  ].join(" ")}
                >
                  <span
                    className={selected ? UI_RADIO.toggle.dotInner : "hidden"}
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
