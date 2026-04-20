"use client"
import React from "react";
import { Label, Span } from "./Typography";

export interface SliderProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  id?: string;
}

const SIZE_CLASSES = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
} as const;

export function Slider({
  value: controlledValue,
  defaultValue = 0,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  onChangeEnd,
  disabled = false,
  label,
  showValue = false,
  size = "md",
  className = "",
  id,
}: SliderProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const percentage = ((value - min) / (max - min || 1)) * 100;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
  };

  const handleChangeEnd = () => {
    onChangeEnd?.(value);
  };

  return (
    <div className={["w-full", className].filter(Boolean).join(" ")}>
      {(label || showValue) && (
        <div className="mb-2 flex items-center justify-between gap-3">
          {label ? <Label htmlFor={inputId}>{label}</Label> : <span />}
          {showValue ? (
            <Span className="text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
              {value}
            </Span>
          ) : null}
        </div>
      )}

      <div className="relative">
        <div
          aria-hidden="true"
          className={[
            "pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-zinc-200 dark:bg-slate-700",
            SIZE_CLASSES[size],
          ].join(" ")}
        >
          <div
            className={[
              "h-full rounded-full bg-lime-600 dark:bg-pink-500",
              SIZE_CLASSES[size],
            ].join(" ")}
            style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
          />
        </div>

        <input
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          onMouseUp={handleChangeEnd}
          onTouchEnd={handleChangeEnd}
          className={[
            "appkit-slider relative z-10 bg-transparent",
            disabled ? "appkit-slider--disabled" : "cursor-pointer",
            SIZE_CLASSES[size],
          ].join(" ")}
          aria-label={typeof label === "string" ? label : "Slider"}
        />
      </div>
    </div>
  );
}
