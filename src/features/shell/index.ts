export type { FormShellSection, FormShellProps, UseFormShellResult } from "./FormShell";
export { FormShell, useFormShell, FormSchemaContext } from "./FormShell";

export type { CommandPaletteGroup, CommandPaletteProps } from "./CommandPalette";
export { CommandPalette, useCommandPaletteHotkey } from "./CommandPalette";

export type { QuickFieldType, QuickFieldDef, QuickFormDrawerProps } from "./QuickFormDrawer";
export { QuickFormDrawer } from "./QuickFormDrawer";

export type { StepDef, StepFormProps, StepFormActionsProps } from "./StepForm";
export { StepForm, StepFormActions, StepIndicator } from "./StepForm";

// Collapsible-section form engine — replaces the StepForm wizard.
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
