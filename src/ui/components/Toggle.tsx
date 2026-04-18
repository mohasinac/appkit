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

const UI_TOGGLE = {
  base: "appkit-toggle",
  sizes: {
    sm: "appkit-toggle--sm",
    md: "appkit-toggle--md",
    lg: "appkit-toggle--lg",
  },
  track: "appkit-toggle__track",
  trackOn: "appkit-toggle__track--on",
  trackOff: "appkit-toggle__track--off",
  trackDisabled: "appkit-toggle__track--disabled",
  thumb: "appkit-toggle__thumb",
  thumbOn: "appkit-toggle__thumb--on",
  thumbOff: "appkit-toggle__thumb--off",
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
      className={[UI_TOGGLE.base, UI_TOGGLE.sizes[size], className]
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
          UI_TOGGLE.track,
          checked ? UI_TOGGLE.trackOn : UI_TOGGLE.trackOff,
          disabled ? UI_TOGGLE.trackDisabled : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Span
          aria-hidden="true"
          className={[
            UI_TOGGLE.thumb,
            checked ? UI_TOGGLE.thumbOn : UI_TOGGLE.thumbOff,
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
