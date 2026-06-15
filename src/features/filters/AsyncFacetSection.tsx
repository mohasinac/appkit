"use client"
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Div, Input, Row, Span, Stack, Text } from "../../ui";
import { cn } from "./filterUtils";
import type { FacetOption } from "./FilterFacetSection";
import type { AsyncPage } from "../../ui/components/PaginatedSelect";

const CLS_BADGE_COUNT = "inline-flex items-center justify-center w-5 h-5 rounded-full bg-success-surface dark:bg-success-surface text-success dark:text-success ring-1 ring-emerald-600/20 dark:ring-emerald-400/20";
const CLS_CLEAR_ICON = "inline-flex items-center justify-center w-5 h-5 p-0 text-zinc-500 dark:text-zinc-400 hover:text-error dark:hover:text-error hover:bg-zinc-100 dark:hover:bg-slate-700 transition-colors rounded-full";

export interface AsyncFacetSectionProps {
  title: string;
  selected: string[];
  onChange: (selected: string[]) => void;
  loadOptions: (query: string, page: number) => Promise<AsyncPage<FacetOption>>;
  selectionMode?: "single" | "multi";
  defaultCollapsed?: boolean;
  onClear?: () => void;
  className?: string;
}

/**
 * AsyncFacetSection — collapsible filter section that loads options from the API
 * with search + pagination. Replaces static `FilterFacetSection` for large datasets
 * (>20 items). Uses the same accordion UX pattern for visual consistency.
 */
export function AsyncFacetSection({
  title,
  selected,
  onChange,
  loadOptions,
  selectionMode = "multi",
  defaultCollapsed = true,
  onClear,
  className = "",
}: AsyncFacetSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<FacetOption[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  // label cache so chips show labels even after options change
  const labelMap = useRef<Map<string, string>>(new Map());

  const load = useCallback(
    async (search: string, nextPage: number, reset = false) => {
      setLoading(true);
      try {
        const res = await loadOptions(search, nextPage);
        setOptions((prev) => {
          const merged = reset ? res.items : [...prev, ...res.items];
          merged.forEach((o) => labelMap.current.set(o.value, o.label));
          return merged;
        });
        setPage(nextPage);
        setHasMore(res.hasMore);
      } finally {
        setLoading(false);
      }
    },
    [loadOptions],
  );

  // Load whenever the section is expanded or query changes
  useEffect(() => {
    if (collapsed) return;
    void load(query, 1, true);
  }, [collapsed, query, load]);

  function handleQueryChange(val: string) {
    setQuery(val);
    if (collapsed) setCollapsed(false);
  }

  function toggle(value: string) {
    if (selectionMode === "single") {
      onChange(selected.includes(value) ? [] : [value]);
    } else {
      onChange(
        selected.includes(value)
          ? selected.filter((v) => v !== value)
          : [...selected, value],
      );
    }
  }

  const hasValue = selected.length > 0;
  const selectedLabels = selected
    .map((v) => labelMap.current.get(v) ?? v)
    .slice(0, 3);

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
          onClick={() => setCollapsed((c) => !c)}
          variant="ghost"
          size="sm"
          className="flex flex-1 items-center justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-50 py-1 hover:opacity-80 transition-opacity"
          aria-expanded={!collapsed}
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
              collapsed ? "" : "rotate-180",
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
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
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        )}
      </Row>

      {/* Selected chips — visible when collapsed */}
      {collapsed && hasValue && (
        <Div className="mt-2 flex flex-wrap gap-1">
          {selectedLabels.map((label) => (
            <Span
              key={label}
              size="xs"
              className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-slate-700 border border-zinc-200 dark:border-slate-600" color="muted"
            >
              {label}
            </Span>
          ))}
          {selected.length > 3 && (
            <Span size="xs" className="inline-flex items-center px-2 py-0.5 rounded-full" color="faint">
              +{selected.length - 3} more
            </Span>
          )}
        </Div>
      )}

      {/* Search — always visible (auto-expands on type) */}
      <Div className="mt-2">
        <Input
          type="search"
          placeholder="Search…"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="w-full rounded-md border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </Div>

      {!collapsed && (
        <Stack className="mt-3" gap="xs">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <Row key={opt.value} gap="2.5" className="py-1 cursor-pointer group">
                <input
                  type={selectionMode === "single" ? "radio" : "checkbox"}
                  checked={isSelected}
                  onChange={() => toggle(opt.value)}
                  aria-label={opt.label}
                  className="flex-shrink-0 w-4 h-4 rounded border-zinc-300 dark:border-slate-600 cursor-pointer text-primary-600 dark:text-secondary-500"
                />
                <Span size="sm" className="flex-1 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors truncate" color="muted">
                  {opt.label}
                </Span>
                {opt.count !== undefined && (
                  <Span size="xs" className="tabular-nums flex-shrink-0" color="faint">
                    {opt.count}
                  </Span>
                )}
              </Row>
            );
          })}

          {options.length === 0 && !loading && (
            <Text className="py-1" color="faint" size="xs">
              No results
            </Text>
          )}

          {loading && (
            <Text className="py-1 animate-pulse" color="faint" size="xs">
              Loading…{/* audit-spinner-defaults-ok — inline facet-loader; structural skeleton would mis-fit a single-line dropdown row */}
            </Text>
          )}

          {hasMore && !loading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs text-left text-zinc-400 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 py-1"
              onClick={() => void load(query, page + 1)}
            >
              Load more…
            </Button>
          )}
        </Stack>
      )}
    </Div>
  );
}
