"use client"
import React from "react";
import { Div, Row, Span, Text } from "../../ui";
import { Slider as UiSlider } from "../../ui/components/Slider";
import { cn, ERROR_BASE } from "./utils";

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
  // React.useId() must run unconditionally on every render — using `id ?? React.useId()`
  // skips the hook call whenever `id` is provided, violating the Rules of Hooks.
  const generatedId = React.useId();
  const sliderId = id ?? generatedId;

  const handleChange = (newVal: number) => {
    if (controlledValue === undefined) setInternalValue(newVal);
    onChange?.(newVal);
  };

  const displayValue = formatValue ? formatValue(value) : String(value);

  return (
    <Div className={cn("w-full space-y-2", className)}>
      {(label || showValue) && (
        <Row justify="between">
          {label && (
            <Span size="sm" weight="medium">
              <label htmlFor={sliderId}>{label}</label>
            </Span>
          )}
          {showValue && (
            <Span size="sm" weight="semibold" className="tabular-nums" color="primary">
              {displayValue}
            </Span>
          )}
        </Row>
      )}

      <UiSlider
        id={sliderId}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={handleChange}
        showValue={false}
      />

      <Row color="muted" textSize="xs"
        justify="between"
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
