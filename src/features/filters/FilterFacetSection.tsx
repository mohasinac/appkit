"use client"
import { useEffect, useRef, useState } from "react";
import { Button, Checkbox, Div, Input, Row, Span, Stack, Text } from "../../ui";
import { cn } from "./filterUtils";
import type { FilterOption } from "./filterUtils";

const __O = {
  yAuto: "overflow-y-auto",
} as const;

const CLS_OPTION_SELECTED = "border-success bg-success-surface text-success dark:border-success/60 dark:bg-success-surface dark:text-success";
const CLS_OPTION_DOT = "inline-flex h-4 w-4 items-center justify-center rounded-full bg-success-solid text-[10px] text-success-on-solid";
const CLS_CLEAR_BTN = "w-full py-[var(--appkit-space-1)] text-[length:var(--appkit-text-xs)] text-zinc-400 transition-colors hover:text-error";
const CLS_BADGE_COUNT = "inline-flex items-center justify-center w-5 h-5 rounded-full bg-success-surface dark:bg-success-surface text-success dark:text-success ring-1 ring-success/20";
const CLS_CLEAR_ICON = "inline-flex items-center justify-center w-5 h-5 p-[var(--appkit-space-0)] text-[var(--appkit-color-text-muted)] hover:text-error dark:hover:text-error hover:bg-[var(--appkit-color-surface)] dark:hover:bg-slate-700 transition-colors rounded-full";

export interface FacetOption extends FilterOption {
  count?: number;
}

export interface FilterFacetSectionProps {
  title: string;
  options: FacetOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  selectionMode?: "single" | "multi";
  defaultCollapsed?: boolean;
  searchable?: boolean;
  /** Controlled open state */
  isOpen?: boolean;
  onToggle?: () => void;
  onClear?: () => void;
  className?: string;
  /**
   * "accordion" (default) — collapsible inline section inside a filter drawer.
   * "dropdown" — compact pill button with a floating panel; use in horizontal toolbars.
   */
  displayAs?: "accordion" | "dropdown";
  /**
   * Hide options whose `count` is exactly 0. Requires the caller to populate
   * `FacetOption.count`; opt-in so the existing callers that pass no counts are
   * unaffected. A selected option, or one with no count, is always kept.
   */
  hideEmpty?: boolean;
}

/**
 * FilterFacetSection — collapsible checkbox/radio filter section.
 * Supports single-select and multi-select modes.
 * When searchable, the search input is always visible and typing auto-expands.
 */
export function FilterFacetSection({
  title,
  options,
  selected,
  onChange,
  selectionMode = "multi",
  defaultCollapsed = true,
  searchable = false,
  isOpen: controlledOpen,
  onToggle,
  onClear,
  className = "",
  displayAs = "accordion",
  hideEmpty = false,
}: FilterFacetSectionProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (displayAs !== "dropdown") return;
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [displayAs]);

  const isCollapsed = isControlled ? !controlledOpen : internalCollapsed;
  const handleToggle = () => {
    if (onToggle) onToggle();
    else setInternalCollapsed((c) => !c);
  };

  // When typing in the search box, auto-expand options
  function handleSearch(value: string) {
    setSearch(value);
    if (value && internalCollapsed && !isControlled) {
      setInternalCollapsed(false);
    }
  }

  // Drop options that would return nothing, when the caller supplies counts and
  // opts in. A selected option is always kept — a facet vanishing while it is
  // applied would strand a value in the URL with no control to clear it — and
  // so is an option with no count, since `undefined` means "not counted", not
  // "zero" (Root Cause #59).
  const scoped = hideEmpty
    ? options.filter(
        (o) =>
          selected.includes(o.value) || o.count === undefined || o.count > 0,
      )
    : options;

  const filtered = search
    ? scoped.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      )
    : scoped;

  const toggle = (value: string) => {
    if (selectionMode === "single") {
      onChange(selected.includes(value) ? [] : [value]);
    } else {
      onChange(
        selected.includes(value)
          ? selected.filter((v) => v !== value)
          : [...selected, value],
      );
    }
  };

  const hasValue = selected.length > 0;

  // Selected labels for inline chips (shown when collapsed)
  const selectedLabels = selected
    .map((v) => options.find((o) => o.value === v)?.label ?? v)
    .slice(0, 3);

  // ── Dropdown variant ────────────────────────────────────────────────────
  if (displayAs === "dropdown") {
    return (
      <Div ref={dropdownRef} className={cn("relative inline-block", className)}>
        <Button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          variant="ghost"
          className={cn(
            "inline-flex items-center gap-[var(--appkit-space-1-5)] rounded-full border px-[var(--appkit-space-3)] py-[var(--appkit-space-1-5)] text-[length:var(--appkit-text-sm)] font-medium transition-colors",
            hasValue
              ? CLS_OPTION_SELECTED
              : " bg-[var(--appkit-color-surface)] hover:border-zinc-400 border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] text-[var(--appkit-color-text-muted)] hover:border-[var(--appkit-color-border)]",
          )}
        >
          {title}
          {hasValue && (
            <Span weight="bold" className={CLS_OPTION_DOT}>
              {selected.length}
            </Span>
          )}
          <svg
            className={cn("h-3.5 w-3.5 text-zinc-400 transition-transform", dropdownOpen ? "rotate-180" : "")}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </Button>

        {dropdownOpen && (
          <Div className="absolute left-0 top-full z-[var(--appkit-z-dropdown,50)] mt-1 min-w-[180px] max-w-[260px]" surface="default" rounded="xl" shadow="lg" border="default">
            {searchable && (
              <Div border="subtle" className="border-b" padding="xs">
                <Input
                  type="search"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full rounded-md border px-[var(--appkit-space-2)] py-[var(--appkit-space-1)] text-[length:var(--appkit-text-xs)] focus:outline-none border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-input)] text-[var(--appkit-color-text)]"
                />
              </Div>
            )}
            <Div className={`max-h-56 ${__O.yAuto}`} padding="y-2xs">
              {filtered.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <Row
                    key={option.value}
                    gap="xs"
                    className="cursor-pointer py-[0.375rem] hover:bg-[var(--appkit-color-bg)] mx-1" padding="x-sm" rounded="lg"
                    onClick={() => toggle(option.value)}
                  >
                    <Checkbox
                      bare
                      type={selectionMode === "single" ? "radio" : "checkbox"}
                      checked={isSelected}
                      onChange={() => toggle(option.value)}
                      aria-label={option.label}
                      className="h-3.5 w-3.5 flex-shrink-0 cursor-pointer rounded text-primary-600 border-[var(--appkit-color-border)] dark:text-secondary-500"
                    />
                    <Span size="xs" className="flex-1 truncate" color="muted">
                      {option.label}
                    </Span>
                    {option.count !== undefined && (
                      <Span className="flex-shrink-0 text-[10px] tabular-nums" color="faint">
                        {option.count}
                      </Span>
                    )}
                  </Row>
                );
              })}
              {filtered.length === 0 && (
                <Text paddingY="xs" paddingX="x-sm" color="faint" size="xs">No results</Text>
              )}
            </Div>
            {hasValue && (
              <Div border="subtle" className="border-t p-[0.25rem]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={CLS_CLEAR_BTN}
                  onClick={() => { onChange([]); onClear?.(); setDropdownOpen(false); }}
                >
                  Clear
                </Button>
              </Div>
            )}
          </Div>
        )}
      </Div>
    );
  }

  // ── Accordion variant (default) ─────────────────────────────────────────
  return (
    <Div
      className={cn(
        "p-[var(--appkit-space-4)] border-b border-[var(--appkit-color-border)] last:border-b-0",
        className,
      )}
    >
      {/* Header */}
      <Row gap="xs">
        <Button
          type="button"
          onClick={handleToggle}
          variant="ghost"
          size="sm"
          className="flex-1 justify-[space-between] text-[0.875rem] font-[600] text-[var(--appkit-color-text)] py-[0.25rem] hover:opacity-80 transition-opacity"
          aria-expanded={!isCollapsed}
        >
          <Row as={Span} gap="xs">
            {title}
            {hasValue && (
              <Span size="xs" className={CLS_BADGE_COUNT}>
                {selected.length}
              </Span>
            )}
          </Row>
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
        {onClear && hasValue && (
          <Button
            type="button"
            onClick={onClear}
            variant="ghost"
            size="sm"
            className={CLS_CLEAR_ICON}
            aria-label="Clear filter"
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

      {/* Selected chips — visible when collapsed */}
      {isCollapsed && hasValue && (
        <Row wrap gap="xs" className="mt-2">
          {selectedLabels.map((label) => (
            <Span layout="inline-flex"
              key={label}
              size="xs"
              className="border border-[var(--appkit-color-border)]" rounded="full" padding="pill-xs" surface="subtle" color="muted"
            >
              {label}
            </Span>
          ))}
          {selected.length > 3 && (
            <Span layout="inline-flex" size="xs" rounded="full" padding="pill-xs" color="faint">
              +{selected.length - 3} more
            </Span>
          )}
        </Row>
      )}

      {/* Search input — always visible when searchable */}
      {searchable && (
        <Div className="mt-2">
          <Input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-md border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-input)] px-[var(--appkit-space-2-5)] py-[var(--appkit-space-1-5)] text-[length:var(--appkit-text-xs)] text-[var(--appkit-color-text)] focus:outline-none focus:ring-2 focus:ring-primary-500/20 "
          />
        </Div>
      )}

      {!isCollapsed && (
        <Stack className="mt-3" gap="xs">
          {filtered.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <Row
                key={option.value}
                gap="2.5"
                className="cursor-pointer group" padding="y-2xs"
              >
                {selectionMode === "single" ? (
                  <Checkbox
                    bare
                    type="radio"
                    checked={isSelected}
                    onChange={() => toggle(option.value)}
                    aria-label={option.label}
                    className={cn(
                      "flex-shrink-0 border-[var(--appkit-color-border)] cursor-pointer",
                      "w-4 h-4 rounded-full text-primary-600 dark:text-secondary-500",
                      "focus:ring-primary-500/30 dark:focus:ring-secondary-400/30",
                    )}
                  />
                ) : (
                  <Checkbox
                    bare
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(option.value)}
                    aria-label={option.label}
                    className={cn(
                      "flex-shrink-0 border-[var(--appkit-color-border)] cursor-pointer",
                      "w-4 h-4 rounded text-primary-600 dark:text-secondary-500 checked:bg-primary-600 dark:checked:bg-secondary-500",
                      "focus:ring-primary-500/30 dark:focus:ring-secondary-400/30",
                    )}
                  />
                )}
                <Span size="sm" className="flex-1 group-hover:text-[var(--appkit-color-text)] transition-colors truncate" color="muted">
                  {option.label}
                </Span>
                {option.count !== undefined && (
                  <Span size="xs" className="tabular-nums flex-shrink-0" color="faint">
                    {option.count}
                  </Span>
                )}
              </Row>
            );
          })}
          {filtered.length === 0 && (
            <Text paddingY="2xs" color="faint" size="xs">
              No results
            </Text>
          )}
        </Stack>
      )}
    </Div>
  );
}
