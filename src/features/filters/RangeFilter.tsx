"use client"
import { useState } from "react";
import { Button, Div, Input, Row, Slider, Span, Stack, Text } from "../../ui";
import { cn } from "./filterUtils";

const CLS_BADGE_COUNT = "inline-flex items-center justify-center w-5 h-5 rounded-full bg-success-surface dark:bg-success-surface text-success dark:text-success ring-1 ring-success/20";
const CLS_CLEAR_BTN = "inline-flex items-center justify-center w-5 h-5 text-zinc-500 dark:text-zinc-400 hover:text-error dark:hover:text-error rounded-full transition-colors";

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
      <Row align="center" justify="between">
        <Span size="sm" weight="semibold" className="tabular-nums text-primary-600 dark:text-secondary-400">
          {prefix}
          {minNum}
        </Span>
        <Span size="xs" color="muted">-</Span>
        <Span size="sm" weight="semibold" className="tabular-nums text-primary-600 dark:text-secondary-400">
          {prefix}
          {maxNum}
        </Span>
      </Row>

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

      <Row align="center" justify="between">
        <Span size="xs" color="muted">
          {prefix}
          {minBound}
        </Span>
        <Span size="xs" color="muted">
          {prefix}
          {maxBound}
        </Span>
      </Row>
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
      <Row align="center" gap="sm">
        <Button
          type="button"
          id={`rf-${title}`}
          onClick={handleToggle}
          variant="ghost"
          size="sm"
          className="flex-1 justify-[space-between] text-[0.875rem] font-[600] text-[var(--appkit-color-text)] py-[0.25rem] hover:opacity-80 transition-opacity"
          aria-expanded={!isCollapsed}
        >
          <Span layout="flex" gap="md" >
            {title}
            {hasValue && (
              <Span size="xs" className={CLS_BADGE_COUNT}>
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
            className={CLS_CLEAR_BTN}
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
      </Row>

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

          <Row align="end" gap="sm">
            <Div className="flex-1 min-w-0">
              {minLabel && (
                <Text className="mb-1" color="muted" size="xs">
                  {minLabel}
                </Text>
              )}
              <Div className="relative">
                {prefix && (
                  <Span size="xs" className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" color="faint">
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

            <Span size="xs" className="flex-shrink-0 pb-[0.375rem]" color="faint">
              -
            </Span>

            <Div className="flex-1 min-w-0">
              {maxLabel && (
                <Text className="mb-1" color="muted" size="xs">
                  {maxLabel}
                </Text>
              )}
              <Div className="relative">
                {prefix && (
                  <Span size="xs" className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" color="faint">
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
          </Row>
        </Stack>
      )}
    </Div>
  );
}
