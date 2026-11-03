"use client";

/*
 * 3B item 1b, search/facets subsystem (2026-11-04).
 *
 * WHY THIS SHAPE, NOT A SCHEMA-DERIVED GENERATOR: every admin filter panel
 * in this codebase is hand-written JSX (`ListingViewConfig.renderFilterPanel`
 * — confirmed by reading `DataListingView.tsx` and `AdminOrdersView.tsx` in
 * full), and `filterKeys: string[]` only tracks which URL params COUNT as
 * active filters, it renders nothing. A true schema-derived generator (the
 * `build-sections.tsx` equivalent for filter panels) would need every
 * repository's `SIEVE_FIELDS` widened with rich per-field UI metadata
 * (control kind, options, etc.) across ~50 files — its own large migration,
 * not a quick wire-up.
 *
 * What ships here instead is real, bounded, and safe against this
 * codebase's own documented failure mode (Root Cause #33/#62 — a filter key
 * that does not match a real, backend-recognised field silently returns
 * zero rows or filters nothing, with no error): an admin may ADD a filter
 * control for any field the VIEW'S OWN AUTHOR already named as legal
 * (`availableFacets`, passed by the view — the same "author already knows
 * their own SIEVE_FIELDS" trust boundary `filterKeys` itself already uses),
 * never a freely-typed field name. The control TYPE (text/select/boolean/
 * date) is admin-chosen, reusing `CustomFieldDef` from `field-ui-meta.ts`
 * verbatim — the exact same shape forms already use for custom fields, not
 * a second type invented for this context.
 *
 * Hide/reorder of the resulting facet set uses the same `field-visibility.ts`
 * mechanism as every other 3B-1b subsystem. An unconfigured surface renders
 * nothing extra — the view's own hand-written `renderFilterPanel` output is
 * completely untouched; this is an ADDITIVE block appended after it.
 *
 * 🛑 TWO WIRES, BOTH REQUIRED, OR THE FACET RENDERS AND SILENTLY FILTERS
 * NOTHING (found live 2026-11-04, same failure shape Root Cause #33/#62
 * describes, one layer up):
 *
 *   1. `buildFilters` must fold in `buildAdminFacetFilters(adminFacets, f)`
 *      — this is what turns a typed value into an actual Sieve clause.
 *   2. The view's OWN `filterKeys` array (passed to `useAdminListing`) must
 *      include `...adminFacets.map((f) => f.key)`. `useAdminListing`'s
 *      `applyFilters()`/`currentFilterState` only promote keys named in
 *      `filterKeys` from `pendingFilters` into the query (see
 *      `useAdminListing.ts`) — a facet key absent from that array renders,
 *      accepts input, and round-trips through `pendingFilters` on drawer
 *      reopen, but "Apply Filters" never reaches the actual request. (1)
 *      alone looked complete because a direct `fetch` against the endpoint
 *      with the filter param honours it — the gap is client-side only.
 */

import { useState } from "react";
import { Div } from "./Div";
import { Row, Stack } from "./Layout";
import { Text } from "./Typography";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { FieldInput } from "../forms/FieldInput";
import { FieldSelect } from "../forms/FieldSelect";
import { FieldCheckbox } from "../forms/FieldCheckbox";
import type { CustomFieldDef } from "../../features/shell/field-ui-meta";
import { sieveFilter, SIEVE_OP } from "../../utils/sieve-builder";

export type { CustomFieldDef } from "../../features/shell/field-ui-meta";

/**
 * The apply-side half of this subsystem. `AdminFilterFacets` renders the
 * control and writes typed values into the view's own `pendingFilters`
 * state, but that alone is cosmetic — `ListingViewConfig.buildFilters` is
 * what decides which keys actually reach the Sieve query, and it has no way
 * to know about a facet an admin added at runtime. Every call site's own
 * `buildFilters` must fold this in (`parts.push(...buildAdminFacetFilters(...))`
 * before `parts.join(",")`), or the control renders, accepts input, and
 * silently filters nothing — the exact failure shape Root Cause #33/#62
 * documents for a mismatched facet key, except self-inflicted by the UI
 * itself rather than by a stale filterKeys/SIEVE_FIELDS mismatch.
 */
export function buildAdminFacetFilters(
  facets: CustomFieldDef[],
  pendingFilters: Record<string, string>,
): string[] {
  return facets
    .map((facet) => {
      const value = pendingFilters[facet.key];
      if (value === undefined || value === "") return undefined;
      return sieveFilter(facet.key, SIEVE_OP.EQ, value);
    })
    .filter((clause): clause is string => clause !== undefined);
}

/** A field the view's own author has declared legal to filter on. */
export interface AvailableFacet {
  key: string;
  label: string;
}

export interface AdminFilterFacetsProps {
  /** Admin-defined facets currently configured for this surface. */
  facets: CustomFieldDef[];
  pendingFilters: Record<string, string>;
  setPendingFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  /** Edit-mode-only — fields the owning view says are legal to add a facet for. */
  availableFacets: AvailableFacet[];
  editMode: boolean;
  onAddFacet?: (facet: CustomFieldDef) => void;
  onRemoveFacet?: (key: string) => void;
}

function renderFacetControl(
  facet: CustomFieldDef,
  value: string,
  onChange: (next: string) => void,
) {
  switch (facet.type) {
    case "boolean":
      return (
        <FieldCheckbox
          name={facet.key}
          label={facet.label}
          checked={value === "true"}
          onChange={(checked) => onChange(checked ? "true" : "")}
        />
      );
    case "select":
      return (
        <FieldSelect
          name={facet.key}
          label={facet.label}
          value={value}
          options={(facet.options ?? []).map((o) => ({ value: o, label: o }))}
          onChange={onChange}
        />
      );
    case "date":
      return <FieldInput name={facet.key} type="date" label={facet.label} value={value} onChange={onChange} />;
    case "number":
      return <FieldInput name={facet.key} type="number" label={facet.label} value={value} onChange={onChange} />;
    default:
      return <FieldInput name={facet.key} type="text" label={facet.label} value={value} onChange={onChange} />;
  }
}

/**
 * Appended after a view's own `renderFilterPanel` output. Renders nothing
 * when `facets` is empty and `editMode` is off — the unconfigured, default
 * state every 3B-1b subsystem guarantees.
 */
export function AdminFilterFacets({
  facets,
  pendingFilters,
  setPendingFilters,
  availableFacets,
  editMode,
  onAddFacet,
  onRemoveFacet,
}: AdminFilterFacetsProps) {
  if (facets.length === 0 && !editMode) return null;

  return (
    <Stack gap="sm">
      {facets.map((facet) => (
        <Row key={facet.key} gap="xs" align="start">
          <Div className="flex-1">
            {renderFacetControl(facet, pendingFilters[facet.key] ?? "", (next) =>
              setPendingFilters((prev) => ({ ...prev, [facet.key]: next })),
            )}
          </Div>
          {editMode && (
            <IconButton
              aria-label={`Remove facet "${facet.label}"`}
              icon={<Icon name="delete" size="sm" />}
              size="sm"
              variant="ghost"
              onClick={() => onRemoveFacet?.(facet.key)}
            />
          )}
        </Row>
      ))}
      {editMode && onAddFacet && (
        <AddFacetRow availableFacets={availableFacets} existingKeys={facets.map((f) => f.key)} onAdd={onAddFacet} />
      )}
    </Stack>
  );
}

function AddFacetRow({
  availableFacets,
  existingKeys,
  onAdd,
}: {
  availableFacets: AvailableFacet[];
  existingKeys: string[];
  onAdd: (facet: CustomFieldDef) => void;
}) {
  const remaining = availableFacets.filter((f) => !existingKeys.includes(f.key));
  const [selectedKey, setSelectedKey] = useState(remaining[0]?.key ?? "");
  const [type, setType] = useState<CustomFieldDef["type"]>("text");

  if (remaining.length === 0) {
    return <Text size="xs" color="muted">Every available facet is already added.</Text>;
  }

  const submit = () => {
    const field = remaining.find((f) => f.key === selectedKey);
    if (!field) return;
    onAdd({ key: field.key, label: field.label, type });
    setSelectedKey(remaining.find((f) => f.key !== field.key)?.key ?? "");
  };

  return (
    <Stack gap="xs" surface="subtle" padding="sm" rounded="md">
      <Text size="xs" weight="medium" color="muted">Add a filter facet</Text>
      <Row gap="xs" wrap>
        <FieldSelect
          name="newFacetKey"
          label="Field"
          value={selectedKey}
          options={remaining.map((f) => ({ value: f.key, label: f.label }))}
          onChange={setSelectedKey}
        />
        <FieldSelect
          name="newFacetType"
          label="Control"
          value={type}
          options={[
            { value: "text", label: "Text" },
            { value: "number", label: "Number" },
            { value: "select", label: "Select" },
            { value: "boolean", label: "Toggle" },
            { value: "date", label: "Date" },
          ]}
          onChange={(v) => setType(v as CustomFieldDef["type"])}
        />
      </Row>
      <IconButton aria-label="Add facet" icon={<Icon name="create" size="sm" />} size="sm" variant="outline" onClick={submit} />
    </Stack>
  );
}
