"use client"
import { useEffect, useRef, useState } from "react";
import { Button, Div, Input, Row, Span, Stack, Text } from "../../ui";
import { cn } from "./filterUtils";
import type { FilterOption } from "./filterUtils";

const __O = {
  yAuto: "overflow-y-auto",
} as const;

const CLS_OPTION_SELECTED = "border-success bg-success-surface text-success dark:border-success/60 dark:bg-success-surface dark:text-success";
const CLS_OPTION_DOT = "inline-flex h-4 w-4 items-center justify-center rounded-full bg-success-surface text-[10px] text-white";
const CLS_CLEAR_BTN = "w-full py-1 text-xs text-zinc-400 transition-colors hover:text-error";
const CLS_BADGE_COUNT = "inline-flex items-center justify-center w-5 h-5 rounded-full bg-success-surface dark:bg-success-surface text-success dark:text-success ring-1 ring-emerald-600/20 dark:ring-emerald-400/20";
const CLS_CLEAR_ICON = "inline-flex items-center justify-center w-5 h-5 p-0 text-zinc-500 dark:text-zinc-400 hover:text-error dark:hover:text-error hover:bg-zinc-100 dark:hover:bg-slate-700 transition-colors rounded-full";

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

  const filtered = search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

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
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            hasValue
              ? CLS_OPTION_SELECTED
              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-200 dark:hover:border-slate-500",
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
                  className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-zinc-100"
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
                    className="cursor-pointer py-1.5 hover:bg-zinc-50 dark:hover:bg-slate-800 mx-1" padding="x-sm" rounded="lg"
                    onClick={() => toggle(option.value)}
                  >
                    <input
                      type={selectionMode === "single" ? "radio" : "checkbox"}
                      checked={isSelected}
                      onChange={() => toggle(option.value)}
                      aria-label={option.label}
                      className="h-3.5 w-3.5 flex-shrink-0 cursor-pointer rounded border-zinc-300 text-primary-600 dark:border-slate-600 dark:text-secondary-500"
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
                <Text className="px-3 py-2" color="faint" size="xs">No results</Text>
              )}
            </Div>
            {hasValue && (
              <Div border="subtle" className="border-t p-1">
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
        "p-4 border-b border-zinc-200 dark:border-slate-700 last:border-b-0",
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
          className="flex flex-1 items-center justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-50 py-1 hover:opacity-80 transition-opacity"
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
            className={CLS_CLEAR_ICON}
            aria-label="Clear filter"
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

      {/* Selected chips — visible when collapsed */}
      {isCollapsed && hasValue && (
        <Div className="mt-2 flex flex-wrap gap-1">
          {selectedLabels.map((label) => (
            <Span
              key={label}
              size="xs"
              className="inline-flex items-center border border-zinc-200 dark:border-slate-600" rounded="full" padding="pill-xs" surface="subtle" color="muted"
            >
              {label}
            </Span>
          ))}
          {selected.length > 3 && (
            <Span size="xs" className="inline-flex items-center" rounded="full" padding="pill-xs" color="faint">
              +{selected.length - 3} more
            </Span>
          )}
        </Div>
      )}

      {/* Search input — always visible when searchable */}
      {searchable && (
        <Div className="mt-2">
          <Input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-md border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-secondary-400/20"
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
                  <input
                    type="radio"
                    checked={isSelected}
                    onChange={() => toggle(option.value)}
                    aria-label={option.label}
                    className={cn(
                      "flex-shrink-0 border-zinc-300 dark:border-slate-600 cursor-pointer",
                      "w-4 h-4 rounded-full text-primary-600 dark:text-secondary-500",
                      "focus:ring-primary-500/30 dark:focus:ring-secondary-400/30",
                    )}
                  />
                ) : (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(option.value)}
                    aria-label={option.label}
                    className={cn(
                      "flex-shrink-0 border-zinc-300 dark:border-slate-600 cursor-pointer",
                      "w-4 h-4 rounded text-primary-600 dark:text-secondary-500 checked:bg-primary-600 dark:checked:bg-secondary-500",
                      "focus:ring-primary-500/30 dark:focus:ring-secondary-400/30",
                    )}
                  />
                )}
                <Span size="sm" className="flex-1 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors truncate" color="muted">
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
            <Text className="py-1" color="faint" size="xs">
              No results
            </Text>
          )}
        </Stack>
      )}
    </Div>
  );
}
