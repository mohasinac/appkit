"use client";

import React from "react";
import { Div } from "./Div";
import { Text } from "./Typography";

/**
 * FilterChipGroup — labelled wrap-group of pill buttons.
 *
 * The canonical primitive for the "Status / Type / Role" filter chips found
 * on every admin and seller listing view. Replaces the 14-line inline render
 * loop that used to be duplicated across 18+ view components.
 *
 * The `"All"` sentinel collapses to an empty filter string when picked so
 * callers can write `setFilters(p => ({ ...p, status: id }))` directly.
 *
 * @example
 * ```tsx
 * <FilterChipGroup
 * label="Status"
 * tabs={ADMIN_ORDER_STATUS_TABS}
 * value={pendingFilters.status}
 * onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
 * />
 * ```
 */
export interface FilterChipGroupTab {
  id: string;
  label: string;
}

export interface FilterChipGroupProps {
  /** Section label shown above the chips. */
  label: string;
  /** Tab definitions. Pass a constant from `appkit/src/features/admin/constants/filter-tabs.ts`. */
  tabs: readonly FilterChipGroupTab[];
  /** Current filter value (empty string = "All" selected). */
  value: string;
  /** Called with the new filter value (`""` when `All` is picked). */
  onChange: (value: string) => void;
  /** Sentinel id treated as "no filter" — defaults to `"All"`. */
  allId?: string;
  /** Optional className spread onto the outer wrapper. */
  className?: string;
}

const ACTIVE_CLS =
  "bg-[var(--appkit-color-primary)] text-white border-[var(--appkit-color-primary)]";
const INACTIVE_CLS =
  "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800";
const CHIP_BASE_CLS =
  "rounded-full px-3 py-1 text-xs font-medium border transition-colors";
const LABEL_CLS =
  "text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400";

export function FilterChipGroup({
  label,
  tabs,
  value,
  onChange,
  allId = "All",
  className,
}: FilterChipGroupProps) {
  const current = value || allId;
  return (
    <Div className={`space-y-2 ${className ?? ""}`.trim()}>
      <Text as="p" className={LABEL_CLS}>
        {label}
      </Text>
      <Div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = current === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(tab.id === allId ? "" : tab.id)}
              className={`${CHIP_BASE_CLS} ${isActive ? ACTIVE_CLS : INACTIVE_CLS}`}
            >
              {tab.label}
            </button>
          );
        })}
      </Div>
    </Div>
  );
}
