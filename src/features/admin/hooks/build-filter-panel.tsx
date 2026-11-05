"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { sieveFilter, SIEVE_OP } from "@mohasinac/appkit/client";
import { FilterChipGroup } from "../../../ui/components/FilterChipGroup";
import type { AdminFilterTab } from "../constants/filter-tabs";

/**
 * One filterable field, declared once instead of hand-writing a
 * `<FilterChipGroup>` block plus its own `filterKeys`/`buildFilters` entries.
 * `tabs` reuses `AdminFilterTab`'s own closed id/label shape — a chip's `id`
 * IS the Sieve value, the same invariant `audit-filter-tab-enums.mjs`
 * already enforces on every hand-written set.
 */
export interface FilterPanelFieldDef {
  /** Key in `pendingFilters`/`filterKeys`, and — unless `sieveField` overrides it — the Sieve field name. */
  key: string;
  label: string;
  tabs: readonly AdminFilterTab[];
  /** Checkbox semantics — several chips active at once, pipe-joined OR-group. See `FilterChipGroup`'s own doc comment. */
  multiple?: boolean;
  /** Set when the UI key and the real Sieve/Firestore field name differ (e.g. `type` filtering `listingType`). Defaults to `key`. */
  sieveField?: string;
}

export interface BuiltFilterPanel {
  filterKeys: string[];
  buildFilters: (state: Record<string, string>) => string | undefined;
  renderFilterPanel: (ctx: {
    pendingFilters: Record<string, string>;
    setPendingFilters: Dispatch<SetStateAction<Record<string, string>>>;
  }) => ReactNode;
}

/**
 * Schema-derived filter-panel generator (3B/5B, overhaul brief) — the
 * `buildSectionsFromSchema` equivalent for a `ListingViewConfig`'s
 * `renderFilterPanel`/`filterKeys`/`buildFilters` trio.
 *
 * `SIEVE_FIELDS` (the repository-level Sieve allow-list) carries no UI
 * metadata at all — no label, no options, no control kind, just
 * `canFilter`/`canSort` — so a literal runtime schema-walk can't reconstruct
 * a filter UI from it alone, the same reason a bare Zod schema needs
 * `annotate()` before `buildSectionsFromSchema` can render a form from it.
 * `FilterPanelFieldDef[]` is that one declaration; this function is the
 * shared renderer + Sieve-clause builder every view no longer hand-writes.
 *
 * Every chip-based `renderFilterPanel` in this codebase reduces to the same
 * three steps this replaces: an equality (or OR-group, when `multiple`)
 * Sieve clause per field, a `<FilterChipGroup>` per field, one `filterKeys`
 * entry per field — see `AdminProductsView`'s status/type filters for the
 * first real conversion. A view whose filters are NOT reducible to that
 * (date ranges, free-text search, `AdminFilterFacets`-style admin-added
 * extras) composes those alongside this function's output exactly as it
 * would compose two hand-written pieces today.
 */
export function buildFilterPanel(fields: readonly FilterPanelFieldDef[]): BuiltFilterPanel {
  return {
    filterKeys: fields.map((f) => f.key),
    buildFilters: (state) => {
      const parts: string[] = [];
      for (const f of fields) {
        const raw = state[f.key];
        if (!raw) continue;
        const sieveField = f.sieveField ?? f.key;
        if (f.multiple) {
          // Same protective effect as a type-specific parser (e.g.
          // `parseSelectedListingTypes`'s `isListingType` check), generalised
          // to ANY field's own tab set: dedupe, drop the legacy "All"
          // sentinel, and drop any id this field's own tabs don't recognise.
          const validIds = new Set(f.tabs.map((t) => t.id));
          const values = [...new Set(raw.split("|").map((s) => s.trim()).filter(Boolean))].filter(
            (id) => id !== "All" && validIds.has(id),
          );
          if (values.length > 0) parts.push(sieveFilter(sieveField, SIEVE_OP.EQ, values.join("|")));
        } else if (raw !== "All") {
          parts.push(sieveFilter(sieveField, SIEVE_OP.EQ, raw));
        }
      }
      return parts.join(",") || undefined;
    },
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <>
        {fields.map((f) => (
          <FilterChipGroup
            key={f.key}
            label={f.label}
            tabs={f.tabs}
            multiple={f.multiple}
            value={pendingFilters[f.key] ?? ""}
            onChange={(value) => setPendingFilters((p) => ({ ...p, [f.key]: value }))}
          />
        ))}
      </>
    ),
  };
}
