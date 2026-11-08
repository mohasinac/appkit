"use client";

/*
 * WHY: A `SectionDef[]` written by hand is a second source of truth that has to
 *      stay aligned with the schema that validates it. Nothing enforces the
 *      alignment, so a field added to the schema renders nowhere, and a field
 *      removed from the schema keeps rendering into a key that is stripped on
 *      save. `audit-form-field-roundtrip` exists to catch exactly that — this
 *      file removes the opportunity instead.
 * WHAT: `buildSectionsFromSchema` — walk a schema's shape, group by
 *       `FieldUiMeta.section`, pack consecutive fields into `<FormGroup>` rows
 *       by their `row` span, and pick each control from its `kind`.
 *
 * Sections become DERIVED, exactly as quick mode already is. Adding a field to
 * the schema puts it in the right section, in the right row, in the right mode,
 * with one edit rather than three.
 *
 * ## The escape hatch is per field, not per form
 *
 * `renderers` overrides a single field's JSX while everything around it stays
 * derived. That matters: a form with one bespoke control should not have to
 * hand-write its other twelve fields, which is what an all-or-nothing escape
 * hatch would force and is how hand-written section arrays got normalised in
 * the first place.
 *
 * EXPORTS:
 *   buildSectionsFromSchema, groupFieldsBySection, packRows,
 *   type FieldRenderer, type BuildSectionsOptions
 *
 * @tag domain:forms
 * @tag layer:shared
 * @tag pattern:slot-shell
 * @tag access:client
 * @tag consumers:SectionForm callsites
 * @tag sideEffects:none
 */

import { groupRank, resolveSectionGroup } from "./form-sections";
import { Fragment, useState, type ReactNode } from "react";
import type { ZodTypeAny } from "zod";
import type { FormValues } from "../../schemas/types";
import { Div } from "../../ui/components/Div";
import { FormGroup } from "../../ui/components/Form";
import { Icon } from "../../ui/components/Icon";
import { IconButton } from "../../ui/components/IconButton";
import { PaginatedSelect } from "../../ui/components/PaginatedSelect";
import { Row, Stack } from "../../ui/components/Layout";
import { Text } from "../../ui/components/Typography";
import { FieldInput } from "../../ui/forms/FieldInput";
import { FieldSelect } from "../../ui/forms/FieldSelect";
import { FieldTextarea } from "../../ui/forms/FieldTextarea";
import { FieldCheckbox } from "../../ui/forms/FieldCheckbox";
import type { SectionDef } from "./SectionForm";
import { humaniseFieldName } from "./entity-form";
import {
  ROW_COLUMNS,
  inferFieldUiMeta,
  objectShape,
  schemaEnumOptions,
  schemaIsOptional,
  ui,
  PAGINATED_SELECT_THRESHOLD,
  type CustomFieldDef,
  type FieldRow,
  type FieldUiMeta,
  type FormStep,
} from "./field-ui-meta";

/** The scalar shape a `CustomFieldDef` value can hold — never nested, never `unknown`. */
export type CustomFieldValue = string | number | boolean;

/** One field, resolved: its name, its schema, and its final metadata. */
export interface ResolvedField {
  name: string;
  schema: ZodTypeAny;
  meta: FieldUiMeta;
  required: boolean;
}

/** Per-field JSX override. Receives everything the derived control would get. */
export type FieldRenderer<T extends object> = (props: {
  field: ResolvedField;
  values: T;
  onChange: (partial: Partial<T>) => void;
  errors: Record<string, string>;
}) => ReactNode;

export interface BuildSectionsOptions<T extends object> {
  /** Per-field JSX overrides, keyed by field name. */
  renderers?: Record<string, FieldRenderer<T>>;
  /** Option lists for `kind: "select"` fields that aren't Zod enums. */
  options?: Record<string, { value: string; label: string }[]>;
  /** Section id → label, when no field declared `sectionLabel`. */
  sectionLabels?: Record<string, string>;
  /**
   * Section ids in the order they should appear. Sections not listed follow,
   * in first-declaration order. `sectionRequired` still sorts first regardless.
   */
  sectionOrder?: string[];
  /**
   * Admin-authored per-field visibility override (Phase 3B widget system,
   * `_internal/server/features/forms/field-visibility.ts` +
   * `features/shell/useFieldVisibility.ts`), keyed by field name. `false`
   * hides the field; absent or `true` leaves it to `when` alone. Optional
   * and additive — every existing caller that doesn't pass this renders
   * byte-identically to before.
   *
   * 🛑 Combines with `FieldUiMeta.when` by AND, `when` evaluated first,
   * NEVER the reverse: an admin override may only hide a field `when`
   * would otherwise show, never resurrect one `when` has ruled out. Forcing
   * a `when`-gated field back on is a genuinely harder problem — see this
   * field's own usage site in `render` below for why — and is deliberately
   * not supported here.
   */
  fieldVisibility?: Record<string, boolean>;
  /**
   * Shows every field regardless of `fieldVisibility` (an admin re-enabling
   * a field has to be able to SEE it first) plus a small toggle beside
   * each one — "inline on the page itself, same pattern as page regions"
   * (owner's own instruction on where this control lives). Pass the
   * viewer's own `EditModeProvider` state; `build-sections.tsx` does not
   * read it itself, so this stays usable in a context with no edit-mode
   * concept at all. Ignored when `fieldVisibility` is not supplied.
   */
  editMode?: boolean;
  /** Required when `editMode` is `true` — flips one field's stored visibility. */
  onToggleFieldVisibility?: (fieldName: string, nextVisible: boolean) => void;
  /**
   * Admin-chosen render order (3B item 1b, `useFieldVisibility().fieldOrder`).
   * Fields named here render first, in this order; fields not named keep
   * their schema-declared relative order, appended after. Optional and
   * additive — omit it and every field sorts exactly as before.
   */
  fieldOrder?: string[];
  /**
   * Edit-mode-only reorder — renders move-up/move-down buttons beside each
   * field's eye-toggle (RS13-adjacent decision, 2026-11-04: an up/down
   * BUTTON pair, never drag-and-drop — matching this codebase's one other
   * real reorder UI, `NavPermissionsManager.tsx`'s ▲/▼ pattern, and the
   * project-wide "no drag-and-drop, discrete controls only" constraint that
   * already governs the card-element span picker). This function resolves
   * the ADJACENT field name itself (scoped to the current section's own
   * visible order, matching how `fieldOrder` already only reorders WITHIN
   * a field's schema-derived section, never across one) — the caller's job
   * is only "persist a swap of these two names", via
   * `swapFieldOrder(fieldOrder, allFieldNames, fieldName, neighborName)`
   * (`field-ui-meta.ts`). Ignored when `editMode` is not `true`.
   */
  onMoveField?: (fieldName: string, neighborFieldName: string) => void;
  /**
   * Admin-defined fields with no presence in the schema (3B item 1b). They
   * render as their OWN section, after every schema-derived section, via a
   * small fixed `type → control` map — never through `renderers`, which is
   * keyed by a real schema field name these are not. Empty/omitted renders
   * nothing extra, so an unconfigured surface is byte-identical to before
   * this option existed.
   */
  customFields?: CustomFieldDef[];
  /** Current values for `customFields`, keyed by `CustomFieldDef.key`. */
  customFieldValues?: Record<string, CustomFieldValue>;
  /** Required when `customFields` is non-empty. */
  onCustomFieldChange?: (key: string, value: CustomFieldValue | undefined) => void;
  /**
   * Edit-mode-only — defines a new field with no schema presence. Rendered
   * as a small "Add field" row at the end of the custom-fields section,
   * same "inline on the page itself" placement as the field-visibility
   * eye-icons. Ignored when `editMode` is not `true`.
   */
  onAddCustomField?: (field: CustomFieldDef) => void;
  /** Edit-mode-only — removes a custom field definition AND its stored value. */
  onRemoveCustomField?: (key: string) => void;
}

const CUSTOM_FIELDS_SECTION_ID = "__customFields";

/**
 * Enum members as `<FieldSelect>` options.
 *
 * Both the zod-version handling and the optional/required test live in
 * `field-ui-meta.ts` — this file must not grow a second copy, which is how the
 * two majors' differing `_def` shapes would come to be handled inconsistently.
 */
function selectOptions(schema: ZodTypeAny): { value: string; label: string }[] | null {
  const options = schemaEnumOptions(schema);
  return options ? options.map((o) => ({ value: o, label: humaniseFieldName(o) })) : null;
}

/**
 * Resolve every field in a schema's shape.
 *
 * Fields with no registration are still returned, carrying inferred metadata
 * and a `section` of `""`. Dropping them silently would hide the exact defect
 * `audit-field-ui-meta` is meant to report — an unregistered field, or one
 * whose `.register()` was not the last call in the chain and was therefore
 * discarded by a subsequent `.optional()`.
 */
export function resolveFields(schema: ZodTypeAny): ResolvedField[] {
  const shape = objectShape(schema);
  if (!shape) return [];
  return Object.entries(shape).map(([name, fieldSchema]) => {
    const explicit = ui.get(fieldSchema);
    const meta = {
      section: "",
      ...inferFieldUiMeta(name, fieldSchema),
      ...(explicit ?? {}),
    } as FieldUiMeta;
    return { name, schema: fieldSchema, meta, required: !schemaIsOptional(fieldSchema) };
  });
}

/** Group resolved fields by section, preserving declaration order within each. */
export function groupFieldsBySection(fields: ResolvedField[]): Map<string, ResolvedField[]> {
  const bySection = new Map<string, ResolvedField[]>();
  for (const field of fields) {
    // A derived field is never a bare input, but "never an input" and "never
    // shown" are different questions and the tier answers them differently:
    //
    //   t2-server / t3-mirror / t4-aggregate — the client cannot know the value
    //     at edit time (an id, a timestamp, a rollup). Omitted entirely; a blank
    //     read-only box for a value that does not exist yet is noise.
    //   t1-derive — the client CAN compute it, live, from a field on this same
    //     form (slug from title). Kept, and rendered read-only by renderField,
    //     so the user can see what will be saved and cannot desync it from its
    //     source by typing.
    //
    // Absent `tier` keeps the original behaviour of dropping the field: that is
    // what every existing `derived: true` annotation was written against.
    if (field.meta.derived && field.meta.tier !== "t1-derive") continue;
    const key = field.meta.section || "advanced";
    const bucket = bySection.get(key);
    if (bucket) bucket.push(field);
    else bySection.set(key, [field]);
  }
  for (const bucket of bySection.values()) {
    bucket.sort((a, b) => (a.meta.order ?? Number.MAX_SAFE_INTEGER) - (b.meta.order ?? Number.MAX_SAFE_INTEGER));
  }
  return bySection;
}

/**
 * Pack consecutive fields into rows by their span.
 *
 * A `full` field always breaks the current row — that is what stops a media
 * upload or a textarea being squeezed alongside a short input. Mixed spans
 * start a new row too, rather than being crammed together: two `pair` fields
 * make a clean 2-up, a `pair` next to a `quarter` makes neither.
 */
export function packRows(fields: ResolvedField[]): ResolvedField[][] {
  const rows: ResolvedField[][] = [];
  let current: ResolvedField[] = [];
  let currentSpan: FieldRow | null = null;

  const flush = () => {
    if (current.length > 0) rows.push(current);
    current = [];
    currentSpan = null;
  };

  for (const field of fields) {
    const span = field.meta.row ?? "pair";
    if (span === "full") {
      flush();
      rows.push([field]);
      continue;
    }
    if (currentSpan !== null && (span !== currentSpan || current.length >= ROW_COLUMNS[span])) {
      flush();
    }
    current.push(field);
    currentSpan = span;
  }
  flush();
  return rows;
}

/**
 * The draft, minus every field whose `when` predicate says it is not on screen.
 *
 * ## Why this exists, and why it is not optional
 *
 * A `when` predicate hides a CONTROL; it does not clear the value behind it.
 * So a form that renders conditionally and submits `{...draft}` sends whatever
 * the user typed before they switched the option away — the control is gone
 * from the screen and its value is still in the payload.
 *
 * That is not hypothetical. Four of the twenty dead controls found in the W3c
 * sweep were exactly this: a cap typed on a percentage coupon persisted after
 * switching to free-shipping; a giveaway slot price written under uniform
 * pricing; an AdSense slot shipped with a manually-authored ad. Each looked
 * right on screen and saved something else.
 *
 * Build the payload from THIS, not from the draft, and hidden-implies-not-sent
 * holds by construction rather than by remembering.
 *
 * Fields with no `when` are always kept, so a schema with no conditionals gets
 * its draft back unchanged and the call is free.
 */
export function visibleValues<T extends object>(schema: ZodTypeAny, values: T): Partial<T> {
  const fields = resolveFields(schema);
  if (!fields.some((f) => f.meta.when)) return values;

  const out: Partial<T> = {};
  for (const field of fields) {
    if (field.meta.when && !field.meta.when(values as never)) continue;
    const key = field.name as keyof T;
    if (key in values) out[key] = values[key];
  }
  return out;
}

/**
 * Build the `SectionDef[]` a `<SectionForm>` renders.
 *
 * Section order: `sectionRequired` first (there is normally exactly one — the
 * fields without which the record cannot be saved), then `sectionOrder`, then
 * first-declaration order.
 */
export function buildSectionsFromSchema<T extends object>(
  schema: ZodTypeAny,
  opts: BuildSectionsOptions<T> = {},
): SectionDef<T>[] {
  const fields = resolveFields(schema);
  // Admin `fieldOrder` (3B item 1b) overrides `meta.order` only for the
  // fields it names, each getting its index as its new order — low enough
  // to sort before every unset field (whose order stays `undefined`, i.e.
  // MAX_SAFE_INTEGER). Fields it does NOT name are untouched, so they keep
  // their existing relative order and simply render after the named ones.
  if (opts.fieldOrder && opts.fieldOrder.length > 0) {
    const position = new Map(opts.fieldOrder.map((name, i) => [name, i]));
    for (const field of fields) {
      const i = position.get(field.name);
      if (i !== undefined) field.meta = { ...field.meta, order: i };
    }
  }
  const bySection = groupFieldsBySection(fields);

  const declarationOrder = [...bySection.keys()];
  const explicitOrder = opts.sectionOrder ?? [];

  /**
   * Order is: required first, then an explicit `sectionOrder` if the caller
   * gave one, then the section's GROUP band, then declaration order.
   *
   * The group band is what makes "required → additional → … → least important
   * last" hold without every form maintaining its own `sectionOrder`. It cannot
   * come from the section id, because ids are free-form and form-specific —
   * see the note on `FieldUiMeta.group`. An explicit `sectionOrder` still wins,
   * so a form with a genuine bespoke sequence keeps it.
   */
  const rank = (id: string) => {
    const bucket = bySection.get(id) ?? [];
    if (bucket.some((f) => f.meta.sectionRequired)) return -1000;
    const i = explicitOrder.indexOf(id);
    if (i !== -1) return i;
    const group = resolveSectionGroup(id, bucket.find((f) => f.meta.group)?.meta.group);
    // Band first, declaration order inside the band. The multiplier just has to
    // exceed any plausible section count in one form.
    return explicitOrder.length + groupRank(group) * 1000 + declarationOrder.indexOf(id);
  };

  const sections: SectionDef<T>[] = declarationOrder
    .slice()
    .sort((a, b) => rank(a) - rank(b))
    .map((sectionId) => {
      const sectionFields = bySection.get(sectionId) ?? [];
      const label =
        sectionFields.find((f) => f.meta.sectionLabel)?.meta.sectionLabel ??
        opts.sectionLabels?.[sectionId] ??
        humaniseFieldName(sectionId);

      return {
        id: sectionId,
        label,
        required: sectionFields.some((f) => f.meta.sectionRequired),
        quick: sectionFields.some((f) => f.meta.quick),
        // Any section holding uncommitted state must stay mounted while
        // collapsed — `<Collapse>` unmounts children, which would discard an
        // in-flight media upload. Inference sets this for every media field.
        keepMounted: sectionFields.some((f) => f.meta.sectionKeepMounted),
        fields: sectionFields.map((f) => f.name),
        render: ({ values, onChange, errors }) => {
          /*
           * Filtered per render, not once at build time — the predicate reads
           * the CURRENT values, so a field appears the moment its condition
           * becomes true. Rows are packed after filtering so a hidden field
           * does not leave a gap in a two-up row.
           *
           * `when` evaluates FIRST, `fieldVisibility` only narrows further —
           * see `BuildSectionsOptions.fieldVisibility`'s own doc comment for
           * why the order is not interchangeable.
           */
          const whenVisible = sectionFields.filter(
            (f) => !f.meta.when || f.meta.when(values as FormValues),
          );
          const visible = opts.editMode
            ? whenVisible
            : whenVisible.filter((f) => opts.fieldVisibility?.[f.name] !== false);
          return (
            <>
              {packRows(visible).map((row, i) => (
                <FormGroup key={`${sectionId}-row-${i}`} columns={ROW_COLUMNS[row[0].meta.row ?? "pair"]}>
                  {row.map((field) => {
                    const node = renderField<T>(field, { values, onChange, errors }, opts);
                    if (!opts.editMode) return node;
                    const hidden = opts.fieldVisibility?.[field.name] === false;
                    // Adjacency within THIS section's own visible order —
                    // same scope `fieldOrder` already reorders within (see
                    // `onMoveField`'s own doc comment for why cross-section
                    // is out of scope).
                    const idx = visible.indexOf(field);
                    const upNeighbor = idx > 0 ? visible[idx - 1].name : undefined;
                    const downNeighbor = idx < visible.length - 1 ? visible[idx + 1].name : undefined;
                    return (
                      <FieldVisibilityEditWrapper
                        key={`${field.name}-visibility`}
                        hidden={hidden}
                        // The stored value IS the new `isVisible()` result
                        // (`true` = shown, `false` = hidden), and `hidden`
                        // is true exactly when the stored value is `false`
                        // — so the value to store on toggle equals `hidden`
                        // itself: hidden→store true (becomes shown),
                        // shown→store false (becomes hidden).
                        onToggle={() => opts.onToggleFieldVisibility?.(field.name, hidden)}
                        onMoveUp={upNeighbor ? () => opts.onMoveField?.(field.name, upNeighbor) : undefined}
                        onMoveDown={downNeighbor ? () => opts.onMoveField?.(field.name, downNeighbor) : undefined}
                      >
                        {node}
                      </FieldVisibilityEditWrapper>
                    );
                  })}
                </FormGroup>
              ))}
            </>
          );
        },
      } satisfies SectionDef<T>;
    });

  // Admin-defined fields with no schema presence (3B item 1b) — always
  // LAST, never interleaved with a schema-derived section. Omitted entirely
  // for a non-admin viewer with none defined, so an unconfigured surface
  // renders this function's output byte-identical to before this option
  // existed. Rendered (empty, with just the "Add field" row) in edit mode
  // even with zero custom fields — otherwise there is no way to define the
  // FIRST one.
  const hasCustomFields = (opts.customFields?.length ?? 0) > 0;
  if (hasCustomFields || (opts.editMode && opts.onAddCustomField)) {
    sections.push(buildCustomFieldsSection(opts.customFields ?? [], opts));
  }

  return sections;
}

/**
 * Partition an already-built `SectionDef[]` into wizard pages, one per
 * `FormStep`. A section is assigned to the step owning its FIRST-declared
 * field (`SectionDef.fields`, in source-declaration order) — never split
 * across two steps, since `<SectionForm>` renders a section as one unit.
 *
 * Sections with no field named in ANY step are appended as a final,
 * untitled page rather than silently dropped — a step config that forgot
 * the custom-fields section (added after `steps` was authored) must not
 * make that section vanish.
 *
 * `steps.length === 0` returns `[{ title: "", sections }]` — one page
 * holding everything, so a caller can unconditionally map over the result
 * without a separate "no steps" branch.
 */
export function groupSectionsByStep<T extends object>(
  sections: SectionDef<T>[],
  steps: FormStep[],
): { title: string; sections: SectionDef<T>[] }[] {
  if (steps.length === 0) return [{ title: "", sections }];

  const stepOfField = new Map<string, number>();
  steps.forEach((step, i) => step.fields.forEach((name) => {
    if (!stepOfField.has(name)) stepOfField.set(name, i);
  }));

  const pages: SectionDef<T>[][] = steps.map(() => []);
  const unassigned: SectionDef<T>[] = [];
  for (const section of sections) {
    const firstNamed = section.fields?.find((name) => stepOfField.has(name));
    const stepIndex = firstNamed !== undefined ? stepOfField.get(firstNamed) : undefined;
    if (stepIndex !== undefined) pages[stepIndex].push(section);
    else unassigned.push(section);
  }

  const out = steps.map((step, i) => ({ title: step.title, sections: pages[i] }));
  if (unassigned.length > 0) out.push({ title: "", sections: unassigned });
  return out;
}

/**
 * The one section every `customFields`-carrying surface gets, rendering
 * each definition through a small fixed `type → control` map — never
 * through `renderers`, which is keyed by a real schema field name these are
 * not.
 */
function buildCustomFieldsSection<T extends object>(
  customFields: CustomFieldDef[],
  opts: BuildSectionsOptions<T>,
): SectionDef<T> {
  return {
    id: CUSTOM_FIELDS_SECTION_ID,
    label: "Custom fields",
    required: false,
    quick: false,
    // Holds the "Add field" draft's own uncommitted input — collapsing
    // must not discard it, same reasoning media sections already use.
    keepMounted: true,
    fields: customFields.map((f) => f.key),
    render: () => (
      <>
        {customFields.map((field) => (
          <FormGroup key={field.key} columns={opts.editMode ? 1 : 1}>
            {opts.editMode ? (
              <Row gap="xs" align="start">
                <Div className="flex-1">{renderCustomField(field, opts)}</Div>
                <IconButton
                  aria-label={`Remove custom field "${field.label}"`}
                  icon={<Icon name="delete" size="sm" />}
                  size="sm"
                  variant="ghost"
                  onClick={() => opts.onRemoveCustomField?.(field.key)}
                />
              </Row>
            ) : (
              renderCustomField(field, opts)
            )}
          </FormGroup>
        ))}
        {opts.editMode && opts.onAddCustomField && (
          <FormGroup columns={1}>
            <AddCustomFieldRow existingKeys={customFields.map((f) => f.key)} onAdd={opts.onAddCustomField} />
          </FormGroup>
        )}
      </>
    ),
  };
}

/**
 * Edit-mode-only — the small form that defines a brand-new field with no
 * schema presence. Its own local state (the draft key/label/type) is
 * uncommitted input belonging to the EDITOR, not to the surface's real
 * form values, so it lives here rather than threading through `T`.
 */
function AddCustomFieldRow({
  existingKeys,
  onAdd,
}: {
  existingKeys: string[];
  onAdd: (field: CustomFieldDef) => void;
}) {
  const [draft, setDraft] = useState({ key: "", label: "", type: "text" as CustomFieldDef["type"] });
  const [error, setError] = useState<string | undefined>();

  const submit = () => {
    const key = draft.key.trim();
    const label = draft.label.trim();
    if (!key || !label) {
      setError("Give the field a key and a label.");
      return;
    }
    if (existingKeys.includes(key)) {
      setError(`"${key}" already exists on this surface.`);
      return;
    }
    onAdd({ key, label, type: draft.type });
    setDraft({ key: "", label: "", type: "text" });
    setError(undefined);
  };

  return (
    <Stack gap="xs" surface="subtle" padding="sm" rounded="md">
      <Text size="xs" weight="medium" color="muted">Add a custom field</Text>
      <Row gap="xs" wrap>
        <FieldInput
          name="newCustomFieldKey"
          label="Key"
          hint="Storage key — letters/numbers only"
          value={draft.key}
          onChange={(v) => setDraft((d) => ({ ...d, key: v.replace(/[^a-zA-Z0-9_]/g, "") }))}
        />
        <FieldInput
          name="newCustomFieldLabel"
          label="Label"
          value={draft.label}
          onChange={(v) => setDraft((d) => ({ ...d, label: v }))}
        />
        <FieldSelect
          name="newCustomFieldType"
          label="Type"
          value={draft.type}
          options={[
            { value: "text", label: "Text" },
            { value: "number", label: "Number" },
            { value: "select", label: "Select" },
            { value: "boolean", label: "Toggle" },
            { value: "date", label: "Date" },
          ]}
          onChange={(v) => setDraft((d) => ({ ...d, type: v as CustomFieldDef["type"] }))}
        />
      </Row>
      {error && <Text size="xs" color="error">{error}</Text>}
      <IconButton aria-label="Add field" icon={<Icon name="create" size="sm" />} size="sm" variant="outline" onClick={submit} />
    </Stack>
  );
}

function renderCustomField<T extends object>(
  field: CustomFieldDef,
  opts: BuildSectionsOptions<T>,
): ReactNode {
  const value = opts.customFieldValues?.[field.key];
  const set = (v: CustomFieldValue | undefined) => opts.onCustomFieldChange?.(field.key, v);

  switch (field.type) {
    case "boolean":
      return (
        <FieldCheckbox
          key={field.key}
          name={field.key}
          label={field.label}
          checked={Boolean(value)}
          onChange={set}
        />
      );
    case "select":
      return (
        <FieldSelect
          key={field.key}
          name={field.key}
          label={field.label}
          required={field.required}
          value={typeof value === "string" ? value : ""}
          options={(field.options ?? []).map((o) => ({ value: o, label: o }))}
          onChange={set}
        />
      );
    case "number":
      return (
        <FieldInput
          key={field.key}
          name={field.key}
          type="number"
          label={field.label}
          required={field.required}
          value={value == null ? "" : String(value)}
          onChange={(v) => set(v === "" ? undefined : Number(v))}
        />
      );
    case "date":
      return (
        <FieldInput
          key={field.key}
          name={field.key}
          type="date"
          label={field.label}
          required={field.required}
          value={typeof value === "string" ? value.slice(0, 10) : ""}
          onChange={set}
        />
      );
    default:
      return (
        <FieldInput
          key={field.key}
          name={field.key}
          type="text"
          label={field.label}
          required={field.required}
          maxLength={field.maxLength}
          value={typeof value === "string" ? value : value == null ? "" : String(value)}
          onChange={set}
        />
      );
  }
}

/**
 * Edit-mode-only chrome around one field — a small eye/eye-off toggle, and a
 * dimmed "Hidden from form" label when the admin has switched the field off
 * for everyone else. Only ever rendered when `BuildSectionsOptions.editMode`
 * is `true`; every other caller never mounts this and sees byte-identical
 * output to before this mechanism existed.
 */
function FieldVisibilityEditWrapper({
  hidden,
  onToggle,
  onMoveUp,
  onMoveDown,
  children,
}: {
  hidden: boolean;
  onToggle: () => void;
  /** Omit to disable — already first in its section's visible order. */
  onMoveUp?: () => void;
  /** Omit to disable — already last in its section's visible order. */
  onMoveDown?: () => void;
  children: ReactNode;
}) {
  return (
    <Div className={hidden ? "opacity-50" : undefined}>
      <Row gap="xs" align="center" justify="between" className="mb-1">
        {hidden && <Text size="xs" color="muted">Hidden from form</Text>}
        <Row gap="xs" className="ml-auto">
          <IconButton
            aria-label="Move this field up"
            icon={<Icon name="arrow-up" size="sm" />}
            size="sm"
            variant="ghost"
            disabled={!onMoveUp}
            onClick={onMoveUp}
          />
          <IconButton
            aria-label="Move this field down"
            icon={<Icon name="arrow-down" size="sm" />}
            size="sm"
            variant="ghost"
            disabled={!onMoveDown}
            onClick={onMoveDown}
          />
          <IconButton
            aria-label={hidden ? "Show this field" : "Hide this field"}
            icon={<Icon name={hidden ? "hide" : "view"} size="sm" />}
            size="sm"
            variant="ghost"
            onClick={onToggle}
          />
        </Row>
      </Row>
      {children}
    </Div>
  );
}

function renderField<T extends object>(
  field: ResolvedField,
  ctx: { values: T; onChange: (partial: Partial<T>) => void; errors: Record<string, string> },
  opts: BuildSectionsOptions<T>,
): ReactNode {
  const override = opts.renderers?.[field.name];
  // A keyed Fragment, not a wrapper element: an override may legitimately
  // return a block-level control (a media uploader, a repeatable list editor),
  // and wrapping that in a <span> would put block content inside an inline box.
  if (override) return <Fragment key={field.name}>{override({ field, ...ctx })}</Fragment>;

  const { name, meta, required } = field;
  const label = meta.label ?? humaniseFieldName(name);
  const value = (ctx.values as Record<string, unknown>)[name];
  const set = (v: unknown) => ctx.onChange({ [name]: v } as Partial<T>);

  /*
   * A t1-derive field — a slug computed from a title — is a live PREVIEW of
   * what will be saved, not an input.
   *
   * Read-only rather than merely discouraged, because the two are only equal
   * while the user behaves: an editable slug beside its source lets them be
   * desynced, and slug immutability after creation is this codebase's
   * established convention (categories, brands, bundles — Root Cause #39).
   * `required` is deliberately NOT passed on: the user cannot fill it, so
   * marking it required would put a permanent asterisk on a field they are not
   * allowed to touch, and the error summary would name it.
   */
  if (meta.derived) {
    return (
      <FieldInput
        key={name}
        name={name}
        label={label}
        hint={meta.help ?? "Generated automatically — not editable."}
        readOnly
        value={typeof value === "string" ? value : value == null ? "" : String(value)}
        onChange={() => {}}
      />
    );
  }

  switch (meta.kind) {
    case "toggle":
      return (
        <FieldCheckbox
          key={name}
          name={name}
          label={label}
          hint={meta.help}
          checked={Boolean(value)}
          onChange={set}
        />
      );

    case "textarea":
      return (
        <FieldTextarea
          key={name}
          name={name}
          label={label}
          hint={meta.help}
          required={required}
          value={typeof value === "string" ? value : ""}
          onChange={set}
        />
      );

    case "select": {
      const options = opts.options?.[name] ?? selectOptions(field.schema) ?? [];
      /*
       * More than five options and a native dropdown is unscannable — the
       * standing rule in CLAUDE.md § UI Primitive Rules. Decided here, by
       * counting, so it holds for a caller-supplied `opts.options` list too:
       * inference can only see a Zod enum, and the long lists (categories,
       * brands, stores) all arrive through `opts.options`, which is exactly the
       * case that most needs searching.
       */
      if (options.length > PAGINATED_SELECT_THRESHOLD) {
        /*
         * 🛑 The error block here used to be hand-rolled, and was the only
         * field in this generator whose error was not wired like the rest:
         * a `<Text>` with no `id`, nothing pointing `aria-describedby` at it,
         * no `aria-invalid` on the control, and — unlike every `Field*`
         * branch below — the help text was still rendered underneath the
         * error rather than replaced by it.
         *
         * `PaginatedSelect` now takes `name`/`error` and owns all of that,
         * so hand it the error and delete the copy. This is the one branch
         * that every schema-generated form shares, so the fix lands on all
         * of them at once rather than per call site.
         */
        return (
          <Stack key={name} gap="xs">
            <Text size="sm" weight="medium" color="muted">
              {label}
              {required ? " *" : ""}
            </Text>
            <PaginatedSelect
              name={name}
              error={ctx.errors[name]}
              value={typeof value === "string" ? value : null}
              onChange={(v) => set(v ?? "")}
              options={options}
              ariaLabel={label}
              placeholder={`Select ${label.toLowerCase()}…`}
            />
            {meta.help && !ctx.errors[name] && (
              <Text size="xs" color="muted">{meta.help}</Text>
            )}
          </Stack>
        );
      }
      return (
        <FieldSelect
          key={name}
          name={name}
          label={label}
          hint={meta.help}
          required={required}
          value={typeof value === "string" ? value : ""}
          options={options}
          onChange={set}
        />
      );
    }

    case "number":
      return (
        <FieldInput
          key={name}
          name={name}
          type="number"
          label={label}
          hint={meta.help}
          required={required}
          value={value == null ? "" : String(value)}
          onChange={(v) => set(v === "" ? undefined : Number(v))}
        />
      );

    case "date":
      return (
        <FieldInput
          key={name}
          name={name}
          type="date"
          label={label}
          hint={meta.help}
          required={required}
          value={typeof value === "string" ? value.slice(0, 10) : ""}
          onChange={set}
        />
      );

    // `media` and `list` have no derived control on purpose. A MediaUploadField
    // needs an upload context, a staging path and a finalize call that only the
    // owning feature can supply, and a list editor needs to know what an item
    // looks like. Deriving a placeholder for either would render a control that
    // silently fails to save — worse than requiring an explicit renderer.
    case "media":
    case "list":
      return (
        <FieldInput
          key={name}
          name={name}
          label={label}
          hint={meta.help ?? `Provide a renderer for "${name}" — this field needs a custom control.`}
          required={required}
          disabled
          value=""
        />
      );

    default:
      return (
        <FieldInput
          key={name}
          name={name}
          // Defaults to "text". Without the passthrough a password field
          // renders in PLAINTEXT, and an email field gets the wrong mobile
          // keyboard and no autofill — see FieldUiMeta.inputType.
          type={meta.inputType ?? "text"}
          label={label}
          hint={meta.help}
          required={required}
          value={typeof value === "string" ? value : value == null ? "" : String(value)}
          onChange={set}
        />
      );
  }
}
