export type { FormShellSection, FormShellProps, UseFormShellResult } from "./FormShell";
export { FormShell, useFormShell, FormSchemaContext } from "./FormShell";

export type { CommandPaletteGroup, CommandPaletteProps } from "./CommandPalette";
export { CommandPalette, useCommandPaletteHotkey } from "./CommandPalette";

export type { QuickFieldType, QuickFieldDef, QuickFormDrawerProps } from "./QuickFormDrawer";
export { QuickFormDrawer } from "./QuickFormDrawer";


// Collapsible-section form engine. Replaced the StepForm wizard, which was
// deleted 2026-08-26 once its last consumer migrated.
export type {
  SectionDef,
  SectionFormProps,
  UseSectionFormNavResult,
} from "./SectionForm";
export {
  SectionForm,
  useSectionFormNav,
  orderSections,
  buildFieldToSectionIndex,
  sectionAnchorId,
} from "./SectionForm";

// One definition per entity → quick drawer + full page, without drift.
export type { EntityFormDefinition } from "./entity-form";
export {
  deriveQuickFields,
  deriveQuickFieldNames,
  allDefinitionFields,
  applyDerive,
  assertNoDeriveCollision,
  humaniseFieldName,
} from "./entity-form";

// UI metadata on the schema (W3) — sections, rows and quick mode are DERIVED
// from the field itself, so there is no second SectionDef[] to keep aligned.
export type {
  FieldUiMeta,
  FieldRow,
  FieldKind,
  CalculatedTier,
} from "./field-ui-meta";
export {
  ui,
  annotate,
  ROW_COLUMNS,
  inferFieldUiMeta,
  resolveFieldUiMeta,
  unwrapSchema,
  schemaEnumOptions,
  schemaIsOptional,
  objectShape,
} from "./field-ui-meta";

export type {
  ResolvedField,
  FieldRenderer,
  BuildSectionsOptions,
} from "./build-sections";
export {
  buildSectionsFromSchema,
  resolveFields,
  groupFieldsBySection,
  packRows,
  // The payload builder. A `when` predicate hides a CONTROL, not a VALUE, so a
  // draft can still carry a field the user can no longer see — build the
  // submitted object from this, never from the raw draft.
  visibleValues,
} from "./build-sections";

// Field-group primitives (W1-15)
export type {
  TitleDescriptionGroupProps,
  ImageFieldGroupProps,
  SeoFieldGroupProps,
  StatusFieldGroupProps,
  StatusFieldGroupOption,
} from "./field-groups";
export {
  TitleDescriptionGroup,
  ImageFieldGroup,
  SeoFieldGroup,
  StatusFieldGroup,
} from "./field-groups";
