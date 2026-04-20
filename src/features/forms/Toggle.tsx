"use client"
import React from "react";
import { Button, Div, Row, Span } from "../../ui";
import { cn } from "./utils";

export interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  id?: string;
}

const SIZE_CONFIG = {
  sm: {
    track: "w-8 h-[18px]",
    thumb: "w-3.5 h-3.5",
    translateOn: "translate-x-[14px]",
    translateOff: "translate-x-0.5",
  },
  md: {
    track: "w-11 h-6",
    thumb: "w-5 h-5",
    translateOn: "translate-x-5",
    translateOff: "translate-x-0.5",
  },
  lg: {
    track: "w-14 h-7",
    thumb: "w-6 h-6",
    translateOn: "translate-x-7",
    translateOff: "translate-x-0.5",
  },
};

/**
 * Toggle — switch control for boolean input with smooth animation.
 * Supports controlled and uncontrolled modes.
 */
export function Toggle({
  checked: controlledChecked,
  defaultChecked = false,
  onChange,
  disabled = false,
  label,
  size = "md",
  className = "",
  id,
}: ToggleProps) {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
  const checked =
    controlledChecked !== undefined ? controlledChecked : internalChecked;

  const handleChange = () => {
    if (disabled) return;
    const newChecked = !checked;
    if (controlledChecked === undefined) setInternalChecked(newChecked);
    onChange?.(newChecked);
  };

  const toggleId = id ?? React.useId();
  const cfg = SIZE_CONFIG[size];

  return (
    <Row className={cn("gap-3", className)}>
      <Button
        type="button"
        role="switch"
        id={toggleId}
        aria-checked={checked}
        disabled={disabled}
        onClick={handleChange}
        className={cn(
          "relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:focus:ring-secondary-400/30 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
          cfg.track,
          checked
            ? "bg-primary-600 dark:bg-secondary-500"
            : "bg-zinc-200 dark:bg-slate-700",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <Span
          className={cn(
            "inline-block rounded-full bg-white shadow-sm transition-transform duration-200",
            cfg.thumb,
            checked ? cfg.translateOn : cfg.translateOff,
          )}
        />
      </Button>

      {label && (
        <label
          htmlFor={toggleId}
          className={cn(
            "text-sm font-medium cursor-pointer select-none",
            checked
              ? "text-zinc-900 dark:text-zinc-100"
              : "text-zinc-600 dark:text-zinc-400",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          {label}
        </label>
      )}
    </Row>
  );
}
