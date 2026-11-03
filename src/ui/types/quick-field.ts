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
 * existing call site needs one). There is deliberately no
 * `InlineFormWidget`/registry built on top of it either — see
 * `DashboardCardRenderer.tsx`'s own `CardElement.kind === "form"` branch
 * for why that was investigated and explicitly NOT built in the same pass:
 * every real short form in this codebase is tied to a specific record/
 * store the bare `{formId, label}` shape can't carry, so a registry would
 * need a fake first entry with no real consumer. If a real inline-form
 * renderer is ever built, it should reuse `FormField`'s own `type="image"`
 * + `onUpload` contract, the same one `QuickProductForm.tsx` already uses.
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
