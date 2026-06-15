"use client"
import React from "react";
import { Div, Row, Span, Text } from "../../ui";
import { cn, LABEL_BASE, ERROR_BASE } from "./utils";

export interface SliderProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  showValue?: boolean;
  /** Format the displayed value. Defaults to `String(value)`. */
  formatValue?: (value: number) => string;
  className?: string;
  id?: string;
}

/**
 * Slider — single-thumb range slider.
 */
export function Slider({
  value: controlledValue,
  defaultValue = 0,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  label,
  error,
  disabled = false,
  showValue = true,
  formatValue,
  className = "",
  id,
}: SliderProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const sliderId = id ?? React.useId();
  const pct = ((value - min) / (max - min)) * 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = Number(e.target.value);
    if (controlledValue === undefined) setInternalValue(newVal);
    onChange?.(newVal);
  };

  const displayValue = formatValue ? formatValue(value) : String(value);

  return (
    <Div className={cn("w-full space-y-2", className)}>
      {(label || showValue) && (
        <Row justify="between">
          {label && (
            <label htmlFor={sliderId} className={LABEL_BASE}>
              {label}
            </label>
          )}
          {showValue && (
            <Span size="sm" weight="semibold" className="tabular-nums text-zinc-900 dark:text-zinc-100">
              {displayValue}
            </Span>
          )}
        </Row>
      )}

      <Row className="relative h-5">
        {/* Track background */}
        <Div className="absolute inset-y-0 flex items-center w-full">
          <Div className="w-full h-1.5 bg-zinc-200 dark:bg-slate-700" rounded="full">
            <Div
              className="h-full bg-primary-500 dark:bg-secondary-500 transition-all" rounded="full"
              // audit-inline-style-ok: computed percentage
              style={{ width: `${pct}%` }}
            />
          </Div>
        </Div>

        <input
          type="range"
          id={sliderId}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          className={cn(
            "relative w-full appearance-none bg-transparent cursor-pointer",
            "focus:outline-none",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white",
            "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary-500 dark:[&::-webkit-slider-thumb]:border-secondary-500",
            "[&::-webkit-slider-thumb]:shadow-sm",
            "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4",
            "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white",
            "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary-500 dark:[&::-moz-range-thumb]:border-secondary-500",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        />
      </Row>

      <Row
        justify="between"
        className="text-xs text-zinc-400 dark:text-zinc-400"
      >
        <Span>{formatValue ? formatValue(min) : min}</Span>
        <Span>{formatValue ? formatValue(max) : max}</Span>
      </Row>

      {error && (
        <Text className={ERROR_BASE} role="alert">
          {error}
        </Text>
      )}
    </Div>
  );
}
