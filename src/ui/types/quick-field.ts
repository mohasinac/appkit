import type { FormFieldValue } from "../../schemas/types";

/**
 * `"image"` added Phase 3B (2026-11-03) for the widget system's `form`
 * `CardElement` kind, which needs to express a real short create-listing
 * form (`QuickProductForm`'s own 5-field set includes a required image).
 * `QuickFormDrawer.tsx`'s own field-render loop does NOT handle this value
 * — it has no upload plumbing and no existing call site needs one — so an
 * `"image"` field only renders correctly through
 * `InlineFormWidget`/`FORM_WIDGET_REGISTRY` (`features/dashboard/
 * components/InlineFormWidget.tsx`), which reuses `FormField`'s own
 * `type="image"` + `onUpload` contract directly, the same one
 * `QuickProductForm.tsx` already uses.
 */
export type QuickFieldType = "text" | "number" | "select" | "toggle" | "date" | "textarea" | "email" | "url" | "image";

export interface QuickFieldDef {
  name: string;
  label: string;
  type: QuickFieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  defaultValue?: FormFieldValue;
}
