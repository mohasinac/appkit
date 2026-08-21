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
  /**
   * Current filter value. Single-select: one id, or `""` for "All".
   * Multi-select (`multiple`): a pipe-joined set of ids (`"auction|art"`),
   * `""` when nothing is ticked.
   */
  value: string;
  /**
   * Called with the new filter value. Single-select passes the picked id
   * (`""` when `All` is picked); multi-select passes the whole pipe-joined
   * set after toggling the clicked chip.
   */
  onChange: (value: string) => void;
  /** Sentinel id treated as "no filter" — defaults to `"All"`. */
  allId?: string;
  /**
   * Checkbox semantics: several chips can be active at once and the value is
   * a pipe-joined OR-group — the exact shape sievejs parses as a same-field OR
   * and the Firebase adapter upgrades to a `.where(…, "in", …)` query.
   *
   * "Nothing ticked" already means "everything", so the `allId` sentinel chip
   * is not rendered in this mode — it would be a second way to express the
   * same state that every caller would have to remember to clear.
   */
  multiple?: boolean;
  /** Optional className spread onto the outer wrapper. */
  className?: string;
}

const ACTIVE_CLS =
  "bg-[var(--appkit-color-primary)] text-white border-[var(--appkit-color-primary)]";
const INACTIVE_CLS =
  "border-[var(--appkit-color-border)] text-[var(--appkit-color-text-muted)] hover:bg-zinc-50 hover:bg-[var(--appkit-color-surface-elevated)]";
const CHIP_BASE_CLS =
  "rounded-full px-3 py-1 text-xs font-medium border transition-colors";
const LABEL_CLS =
  "text-xs font-semibold uppercase tracking-widest text-[var(--appkit-color-text-muted)]";

/** Split a pipe-joined multi-select value into its ids. */
function parseMulti(value: string): string[] {
  return value ? value.split("|").filter(Boolean) : [];
}

export function FilterChipGroup({
  label,
  tabs,
  value,
  onChange,
  allId = "All",
  multiple = false,
  className,
}: FilterChipGroupProps) {
  const selected = new Set(multiple ? parseMulti(value) : []);
  const current = value || allId;
  // In multi-select the "All" sentinel is redundant with an empty selection —
  // see the `multiple` prop docs.
  const visibleTabs = multiple ? tabs.filter((t) => t.id !== allId) : tabs;

  const handleClick = (tabId: string) => {
    if (!multiple) {
      onChange(tabId === allId ? "" : tabId);
      return;
    }
    // Rebuild in the source array's order, not click order, so the same
    // selection always serialises to the same string — a value that varied by
    // click order would be a different React Query key for identical results.
    const next = new Set(selected);
    if (next.has(tabId)) next.delete(tabId);
    else next.add(tabId);
    onChange(
      visibleTabs
        .map((t) => t.id)
        .filter((id) => next.has(id))
        .join("|"),
    );
  };

  return (
    <Div className={`space-y-2 ${className ?? ""}`.trim()}>
      <Text as="p" className={LABEL_CLS}>
        {label}
      </Text>
      <Div className="flex flex-wrap gap-2" role={multiple ? "group" : undefined} aria-label={multiple ? label : undefined}>
        {visibleTabs.map((tab) => {
          const isActive = multiple ? selected.has(tab.id) : current === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              // Checkboxes report checked state, not pressed state — a screen
              // reader announcing "pressed" for a filter that stays on is wrong.
              role={multiple ? "checkbox" : undefined}
              aria-checked={multiple ? isActive : undefined}
              aria-pressed={multiple ? undefined : isActive}
              onClick={() => handleClick(tab.id)}
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
