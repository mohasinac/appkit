/**
 * FormFieldRegistry — @mohasinac/appkit/contracts
 *
 * Allows consumers to inject extra fields into existing appkit forms without
 * rebuilding or forking them.
 *
 * ## How it works
 *
 * 1. Every appkit `*Form` component accepts an optional `extraFields` prop
 *    typed as `ExtraFormField[]`.
 * 2. The form renders `extraFields` at a designated slot position (default:
 *    after the last built-in field, before the submit button).
 * 3. Consumers may also register fields globally via `registerFormFields()`
 *    so they are applied to every matching form without prop drilling.
 *
 * @example
 * ```tsx
 * // In providers.config.ts — register extra fields globally:
 * import { registerFormFields } from "@mohasinac/appkit/contracts";
 *
 * registerFormFields("product", [
 *   {
 *     key: "hsn",
 *     position: "after:price",
 *     render: ({ value, onChange, disabled }) => (
 *       <FormField label="HSN Code">
 *         <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
 *       </FormField>
 *     ),
 *   },
 * ]);
 *
 * // Or pass directly via prop:
 * <ProductForm
 *   product={product}
 *   onChange={setProduct}
 *   extraFields={[{ key: "hsn", render: ({ value, onChange }) => <HsnField ... /> }]}
 * />
 * ```
 */

// ─── Field descriptor ─────────────────────────────────────────────────────────

export interface ExtraFieldRenderArgs<TValue = unknown> {
  /** Current value for this field key from the parent form state. */
  value: TValue;
  /** Call to update this field's value in the parent form state. */
  onChange: (value: TValue) => void;
  /** Whether the form is in a read-only / disabled state. */
  disabled: boolean;
}

/**
 * A single extra field to be injected into an appkit form.
 *
 * @typeParam TValue  The type of the field's value. Defaults to `unknown`.
 */
export interface ExtraFormField<TValue = unknown> {
  /**
   * Unique key for this field — used as the React list key and to look up
   * the field's value in the form state bag.
   */
  key: string;
  /**
   * Where to render this field relative to a built-in field.
   * Format: `"after:<builtInKey>"` | `"before:<builtInKey>"` | `"end"` (default)
   *
   * @example "after:price"   — render immediately after the `price` field
   * @example "before:status" — render immediately before the `status` field
   * @example "end"           — render after all built-in fields
   */
  position?: `after:${string}` | `before:${string}` | "end";
  /** Render function. Return value is `React.ReactNode` at runtime. */
  render: (args: ExtraFieldRenderArgs<TValue>) => unknown;
}

// ─── Global registry ──────────────────────────────────────────────────────────

const _fieldRegistry = new Map<string, ExtraFormField[]>();

/**
 * Register extra fields for a specific form by its form key (e.g. `"product"`,
 * `"blog"`, `"event"`). Called once in `providers.config.ts`.
 *
 * Fields registered here are merged with any `extraFields` passed directly
 * via props. Props-supplied fields take precedence over registry fields with
 * the same `key`.
 */
export function registerFormFields(
  formKey: string,
  fields: ExtraFormField[],
): void {
  const existing = _fieldRegistry.get(formKey) ?? [];
  // Merge: registry fields + new fields, deduplicated by key (new wins)
  const merged = [
    ...existing.filter((f) => !fields.some((nf) => nf.key === f.key)),
    ...fields,
  ];
  _fieldRegistry.set(formKey, merged);
}

/**
 * Retrieve registered extra fields for a form, merged with any prop-supplied
 * fields. Props-supplied fields override registry fields with the same key.
 */
export function resolveFormFields(
  formKey: string,
  propFields?: ExtraFormField[],
): ExtraFormField[] {
  const registry = _fieldRegistry.get(formKey) ?? [];
  if (!propFields?.length) return registry;
  return [
    ...registry.filter((f) => !propFields.some((pf) => pf.key === f.key)),
    ...propFields,
  ];
}

/** Remove all registered fields for a form key. */
export function removeFormFields(formKey: string): void {
  _fieldRegistry.delete(formKey);
}

/** Reset all registered form fields (used in tests). */
export function _resetFormFields(): void {
  _fieldRegistry.clear();
}
