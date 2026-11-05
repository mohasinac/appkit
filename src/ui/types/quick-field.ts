import type { FormFieldValue } from "../../schemas/types";

/**
 * `"image"` added Phase 3B (2026-11-03) for the widget system's `form`
 * `CardElement` kind, which would need to express a real short
 * create-listing form (`QuickProductForm`'s own 5-field set includes a
 * required image) — groundwork only, currently UNUSED by any real
 * `QuickFieldDef[]` array or any renderer.
 *
 * 🛑 No renderer handles it yet, anywhere. `QuickFormDrawer.tsx`'s own
 * field-render loop does NOT handle this value (no upload plumbing, no
 * existing call site needs one). `DashboardCardRenderer.tsx`'s own
 * `CardElement.kind === "form"` branch now has a real, plural
 * `FORM_WIDGET_REGISTRY` (`quick-add-faq`, `quick-open-support-ticket`,
 * 2026-11-05) — neither entry needs an image field, so this value is still
 * unused there, not because a registry couldn't support it. If a real
 * inline-form field ever needs an upload, it should reuse `FormField`'s own
 * `type="image"` + `onUpload` contract, the same one `QuickProductForm.tsx`
 * already uses.
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
