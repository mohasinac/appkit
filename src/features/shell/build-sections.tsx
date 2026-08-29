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
import { Fragment, type ReactNode } from "react";
import type { ZodTypeAny } from "zod";
import type { FormValues } from "../../schemas/types";
import { FormGroup } from "../../ui/components/Form";
import { PaginatedSelect } from "../../ui/components/PaginatedSelect";
import { Stack } from "../../ui/components/Layout";
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
  type FieldRow,
  type FieldUiMeta,
} from "./field-ui-meta";

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
}

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

  return declarationOrder
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
           */
          const visible = sectionFields.filter(
            (f) => !f.meta.when || f.meta.when(values as FormValues),
          );
          return (
            <>
              {packRows(visible).map((row, i) => (
                <FormGroup key={`${sectionId}-row-${i}`} columns={ROW_COLUMNS[row[0].meta.row ?? "pair"]}>
                  {row.map((field) =>
                    renderField<T>(field, { values, onChange, errors }, opts),
                  )}
                </FormGroup>
              ))}
            </>
          );
        },
      } satisfies SectionDef<T>;
    });
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
        return (
          <Stack key={name} gap="xs">
            <Text size="sm" weight="medium" color="muted">
              {label}
              {required ? " *" : ""}
            </Text>
            <PaginatedSelect
              value={typeof value === "string" ? value : null}
              onChange={(v) => set(v ?? "")}
              options={options}
              ariaLabel={label}
              placeholder={`Select ${label.toLowerCase()}…`}
            />
            {meta.help && <Text size="xs" color="muted">{meta.help}</Text>}
            {ctx.errors[name] && (
              <Text size="xs" color="error" role="alert">{ctx.errors[name]}</Text>
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
