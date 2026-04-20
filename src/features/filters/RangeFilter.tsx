"use client"
import { useState } from "react";
import { Button, Div, Input, Slider, Span, Stack, Text } from "../../ui";
import { cn } from "./filterUtils";

interface DualSliderProps {
  minValue: string;
  maxValue: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  minBound: number;
  maxBound: number;
  step?: number;
  prefix?: string;
}

function DualSlider({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minBound,
  maxBound,
  step = 1,
  prefix = "",
}: DualSliderProps) {
  const minNum = Math.max(
    minBound,
    Math.min(parseFloat(minValue) || minBound, maxBound),
  );
  const maxNum = Math.min(
    maxBound,
    Math.max(parseFloat(maxValue) || maxBound, minBound),
  );

  return (
    <Stack gap="sm" className="w-full">
      <Div className="flex items-center justify-between">
        <Span className="text-sm font-semibold tabular-nums text-primary-600 dark:text-secondary-400">
          {prefix}
          {minNum}
        </Span>
        <Span className="text-xs text-zinc-500 dark:text-zinc-400">-</Span>
        <Span className="text-sm font-semibold tabular-nums text-primary-600 dark:text-secondary-400">
          {prefix}
          {maxNum}
        </Span>
      </Div>

      <Stack gap="xs" aria-hidden="true">
        <Slider
          value={minNum}
          min={minBound}
          max={Math.max(minBound, maxNum - step)}
          step={step}
          onChange={(v) => onMinChange(String(v))}
        />
        <Slider
          value={maxNum}
          min={Math.min(maxBound, minNum + step)}
          max={maxBound}
          step={step}
          onChange={(v) => onMaxChange(String(v))}
        />
      </Stack>

      <Div className="flex items-center justify-between">
        <Span className="text-xs text-zinc-500 dark:text-zinc-400">
          {prefix}
          {minBound}
        </Span>
        <Span className="text-xs text-zinc-500 dark:text-zinc-400">
          {prefix}
          {maxBound}
        </Span>
      </Div>
    </Stack>
  );
}

export interface RangeFilterProps {
  title: string;
  minLabel?: string;
  maxLabel?: string;
  minValue: string;
  maxValue: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  type?: "number" | "date";
  prefix?: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  defaultCollapsed?: boolean;
  showSlider?: boolean;
  minBound?: number;
  maxBound?: number;
  step?: number;
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  onClear?: () => void;
}

export function RangeFilter({
  title,
  minLabel,
  maxLabel,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  type = "number",
  prefix,
  minPlaceholder,
  maxPlaceholder,
  defaultCollapsed = true,
  showSlider = false,
  minBound,
  maxBound,
  step = 1,
  className = "",
  isOpen: controlledOpen,
  onToggle,
  onClear,
}: RangeFilterProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isCollapsed = isControlled ? !controlledOpen : internalCollapsed;

  const handleToggle = () => {
    if (onToggle) onToggle();
    else setInternalCollapsed((c) => !c);
  };

  const canShowSlider =
    showSlider &&
    type === "number" &&
    minBound !== undefined &&
    maxBound !== undefined;
  const hasValue = !!(minValue || maxValue);

  const inputClass =
    "w-full rounded-md border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-secondary-400/20";

  return (
    <Div
      role="group"
      aria-labelledby={`rf-${title}`}
      className={cn(
        "p-4 border-b border-zinc-200 dark:border-slate-700 last:border-b-0",
        className,
      )}
    >
      <Div className="flex items-center gap-2">
        <Button
          type="button"
          id={`rf-${title}`}
          onClick={handleToggle}
          variant="ghost"
          size="sm"
          className="flex flex-1 items-center justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-50 py-1 hover:opacity-80 transition-opacity"
          aria-expanded={!isCollapsed}
        >
          <Span className="flex items-center gap-2">
            {title}
            {hasValue && (
              <Span className="inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-600/20">
                1
              </Span>
            )}
          </Span>
          <svg
            className={cn(
              "w-4 h-4 text-zinc-500 dark:text-zinc-400 transition-transform duration-200",
              isCollapsed ? "" : "rotate-180",
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Button>

        {onClear && hasValue && (
          <Button
            type="button"
            onClick={onClear}
            variant="ghost"
            size="sm"
            className="inline-flex items-center justify-center w-5 h-5 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-full transition-colors"
            aria-label="Clear"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        )}
      </Div>

      {!isCollapsed && (
        <Stack gap="3" className="mt-3">
          {canShowSlider && (
            <DualSlider
              minValue={minValue}
              maxValue={maxValue}
              onMinChange={onMinChange}
              onMaxChange={onMaxChange}
              minBound={minBound}
              maxBound={maxBound}
              step={step}
              prefix={prefix}
            />
          )}

          <Div className="flex items-end gap-2">
            <Div className="flex-1 min-w-0">
              {minLabel && (
                <Text className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                  {minLabel}
                </Text>
              )}
              <Div className="relative">
                {prefix && (
                  <Span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 dark:text-zinc-500 pointer-events-none">
                    {prefix}
                  </Span>
                )}
                <Input
                  type={type}
                  value={minValue}
                  onChange={(e) => onMinChange(e.target.value)}
                  placeholder={
                    minPlaceholder ?? (type === "date" ? "From" : "Min")
                  }
                  className={cn(inputClass, prefix ? "pl-5" : "")}
                />
              </Div>
            </Div>

            <Span className="flex-shrink-0 pb-1.5 text-zinc-400 dark:text-zinc-500 text-xs">
              -
            </Span>

            <Div className="flex-1 min-w-0">
              {maxLabel && (
                <Text className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                  {maxLabel}
                </Text>
              )}
              <Div className="relative">
                {prefix && (
                  <Span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 dark:text-zinc-500 pointer-events-none">
                    {prefix}
                  </Span>
                )}
                <Input
                  type={type}
                  value={maxValue}
                  onChange={(e) => onMaxChange(e.target.value)}
                  placeholder={
                    maxPlaceholder ?? (type === "date" ? "To" : "Max")
                  }
                  className={cn(inputClass, prefix ? "pl-5" : "")}
                />
              </Div>
            </Div>
          </Div>
        </Stack>
      )}
    </Div>
  );
}
