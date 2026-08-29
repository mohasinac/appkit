"use client"
import { useState } from "react";
import { Button, Div, Input, Row, Slider, Span, Stack, Text } from "../../ui";
import { cn } from "./filterUtils";

const CLS_BADGE_COUNT = "inline-flex items-center justify-center w-5 h-5 rounded-full bg-success-surface dark:bg-success-surface text-success dark:text-success ring-1 ring-success/20";
const CLS_CLEAR_BTN = "inline-flex items-center justify-center w-5 h-5 text-[var(--appkit-color-text-muted)] hover:text-error dark:hover:text-error rounded-full transition-colors";

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

/**
 * Parse a filter value, distinguishing "not set" from a legitimate zero.
 *
 * 🛑 NOT `parseFloat(v) || bound`. `parseFloat("")` is NaN and falsy, which is
 * the intended case — but so is `parseFloat("0")`, so a user asking for a max
 * of 0 got the 500000 bound instead, and the filter they could see in the
 * inputs was not the one being applied.
 */
function rawNum(value: string): number | null {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
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
  const minRaw = rawNum(minValue);
  const maxRaw = rawNum(maxValue);

  /*
   * Display only. An unset side shows its bound so the track reads sensibly —
   * but the bound is never what gets WRITTEN, which is the distinction the old
   * `|| bound` collapsed.
   */
  const minNum = Math.min(Math.max(minRaw ?? minBound, minBound), maxBound);
  const maxNum = Math.max(Math.min(maxRaw ?? maxBound, maxBound), minBound);

  /*
   * Each slider spans the FULL range and clamps itself on write.
   *
   * It used to derive its opposite end from the other thumb — the min slider's
   * `max` was `maxNum - step` — so with max unset, `maxNum` collapsed to the
   * bound, and any later change to one side silently re-scaled and appeared to
   * reset the other. Clamping on write instead of on range means dragging one
   * thumb can never move or clear the other, and a value that would cross is
   * pinned rather than the whole control rescaling underneath the user.
   */
  const writeMin = (v: number) => onMinChange(String(Math.min(v, maxRaw ?? maxBound)));
  const writeMax = (v: number) => onMaxChange(String(Math.max(v, minRaw ?? minBound)));

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
          max={maxBound}
          step={step}
          onChange={writeMin}
        />
        <Slider
          value={maxNum}
          min={minBound}
          max={maxBound}
          step={step}
          onChange={writeMax}
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
  /**
   * Override the clear behaviour. **Rarely needed** — clearing a range is
   * `onMinChange("") + onMaxChange("")`, which is now the default, so the X
   * appears on every range filter without a call site opting in.
   *
   * It used to be required-in-practice: 18 of the 19 call sites passed nothing
   * and therefore rendered no clear button at all, leaving a range you could
   * set and not unset. Pass this only when clearing must ALSO reset something
   * outside the two values (`FilterPanel` clears its own pending map).
   */
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

  // Clearing a range needs nothing a caller has to supply. See `onClear` above.
  const handleClear =
    onClear ??
    (() => {
      onMinChange("");
      onMaxChange("");
    });

  const inputClass =
    "w-full rounded-md border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-input)] px-[var(--appkit-space-2-5)] py-[var(--appkit-space-1-5)] text-[length:var(--appkit-text-xs)] text-[var(--appkit-color-text)] focus:outline-none focus:ring-2 focus:ring-primary-500/20 ";

  return (
    <Div
      role="group"
      aria-labelledby={`rf-${title}`}
      className={cn(
        "p-[var(--appkit-space-4)] border-b border-[var(--appkit-color-border)] last:border-b-0",
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
              "w-4 h-4 shrink-0 text-[var(--appkit-color-text-muted)] transition-transform duration-200",
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

        {hasValue && (
          <Button
            type="button"
            onClick={handleClear}
            variant="ghost"
            size="sm"
            className={CLS_CLEAR_BTN}
            aria-label="Clear"
          >
            <svg
              className="w-3 h-3 shrink-0"
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
