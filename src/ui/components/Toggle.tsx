"use client";

import React from "react";
import { Label, Span } from "./Typography";

export interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  id?: string;
}

const SIZE_MAP = {
  sm: {
    track: "h-[18px] w-8",
    thumb: "h-3.5 w-3.5",
    translateOn: "translate-x-[14px]",
    translateOff: "translate-x-0.5",
  },
  md: {
    track: "h-6 w-11",
    thumb: "h-5 w-5",
    translateOn: "translate-x-5",
    translateOff: "translate-x-0.5",
  },
  lg: {
    track: "h-7 w-14",
    thumb: "h-6 w-6",
    translateOn: "translate-x-7",
    translateOff: "translate-x-0.5",
  },
} as const;

export function Toggle({
  checked: checkedProp,
  defaultChecked = false,
  onChange,
  disabled = false,
  label,
  size = "md",
  className = "",
  id,
}: ToggleProps) {
  const generatedId = React.useId();
  const toggleId = id ?? generatedId;
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
  const checked = checkedProp ?? internalChecked;
  const sizeConfig = SIZE_MAP[size];

  const handleToggle = () => {
    if (disabled) {
      return;
    }
    const nextValue = !checked;
    if (checkedProp === undefined) {
      setInternalChecked(nextValue);
    }
    onChange?.(nextValue);
  };

  return (
    <div
      className={["inline-flex items-center gap-3", className]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? `${toggleId}-label` : undefined}
        disabled={disabled}
        onClick={handleToggle}
        className={[
          "relative inline-flex shrink-0 items-center rounded-full p-0 transition-colors",
          sizeConfig.track,
          checked
            ? "bg-lime-600 dark:bg-pink-500"
            : "bg-zinc-300 dark:bg-slate-700",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/30 focus-visible:ring-offset-2 dark:focus-visible:ring-pink-500/30 dark:focus-visible:ring-offset-slate-950",
        ].join(" ")}
      >
        <Span
          aria-hidden="true"
          className={[
            "inline-block rounded-full bg-white shadow-sm transition-transform dark:bg-slate-950",
            sizeConfig.thumb,
            checked ? sizeConfig.translateOn : sizeConfig.translateOff,
          ].join(" ")}
        />
      </button>

      {label && (
        <Label
          id={`${toggleId}-label`}
          htmlFor={toggleId}
          className={
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          }
          onClick={disabled ? undefined : handleToggle}
        >
          {label}
        </Label>
      )}
    </div>
  );
}
