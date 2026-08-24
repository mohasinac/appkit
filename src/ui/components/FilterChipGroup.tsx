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
  /**
   * Rows matching this chip within the surface's current scope. Rendered as a
   * trailing count and, with `hideEmpty`, used to drop chips that would return
   * nothing.
   *
   * `undefined` means "not counted / count failed" — NOT zero. Such a chip is
   * always kept, so a surface that supplies no counts behaves exactly as before
   * and a failed count can never hide a filter that has rows (Root Cause #59).
   */
  count?: number;
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
  /**
   * Drop chips whose `count` is exactly 0 — a filter that can only ever return
   * an empty list is noise.
   *
   * Opt-in (default `false`) because most of this component's ~45 call sites
   * supply no counts at all, and because it is only ever correct for a FILTER
   * over existing rows. Never enable it on a picker that CREATES something: a
   * seller with no auctions yet must still be able to make their first one.
   *
   * A chip whose count is `undefined` is always kept — see `FilterChipGroupTab.count`.
   * The currently-selected chip is also always kept, so an active filter can
   * never vanish from under the user mid-interaction.
   */
  hideEmpty?: boolean;
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
// `opacity-70` rather than a fixed colour so the count stays legible against
// both the active (primary fill) and inactive (surface) chip backgrounds —
// a literal text colour would be invisible on one of them in some theme
// (Root Cause #67).
const COUNT_CLS = "ml-1.5 tabular-nums opacity-70";

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
  hideEmpty = false,
  className,
}: FilterChipGroupProps) {
  const selected = new Set(multiple ? parseMulti(value) : []);
  const current = value || allId;
  // In multi-select the "All" sentinel is redundant with an empty selection —
  // see the `multiple` prop docs.
  const allTabs = multiple ? tabs.filter((t) => t.id !== allId) : tabs;
  const visibleTabs = hideEmpty
    ? allTabs.filter((t) => {
        // Never hide the "All" sentinel, and never hide a chip the user has
        // already picked — a filter disappearing while it is applied would
        // leave the URL holding a value with no way to clear it.
        if (t.id === allId) return true;
        if (multiple ? selected.has(t.id) : current === t.id) return true;
        return t.count === undefined || t.count > 0;
      })
    : allTabs;

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
              {typeof tab.count === "number" && (
                <span className={COUNT_CLS}>{tab.count > 99 ? "99+" : tab.count}</span>
              )}
            </button>
          );
        })}
      </Div>
    </Div>
  );
}
