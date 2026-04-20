/**
 * MediaSlider — lightweight range-input wrapper used internally by media editing modals.
 * No external dependencies beyond React and Tailwind.
 */

import React from "react";

export interface MediaSliderProps {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  className?: string;
}

export function MediaSlider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  onChangeEnd,
  className = "",
}: MediaSliderProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange?.(parseFloat(e.target.value))}
      onMouseUp={(e) =>
        onChangeEnd?.(parseFloat((e.target as HTMLInputElement).value))
      }
      onTouchEnd={(e) =>
        onChangeEnd?.(parseFloat((e.target as HTMLInputElement).value))
      }
      className={[
        "w-full h-2 appearance-none cursor-pointer rounded-full",
        "bg-zinc-200 dark:bg-slate-700",
        "accent-primary-600 dark:accent-secondary-400",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
