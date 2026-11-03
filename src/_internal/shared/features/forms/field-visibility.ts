/*
 * WHY: Phase 3B widget system, owner's own scope correction — the admin
 *      field-visibility toggle must apply to "all ecommerce fields,
 *      including the marketplace setups", not one pilot form. One
 *      mechanism, two render-time consumers: a hidden FORM INPUT (gated via
 *      `buildSectionsFromSchema`'s `fieldVisibility` option — see
 *      `build-sections.tsx`) and a hidden DISPLAY field on a read-only page
 *      (the caller decides which).
 *
 * WHAT: The stored shape — one document per "surface" (a form, a detail
 *       view, any admin-identified field group), `fields[name] = false`
 *       meaning hidden, absent/true meaning shown.
 *
 * EXPORTS: FieldVisibilityDoc
 *
 * @tag domain:forms
 * @tag layer:types
 * @tag pattern:none
 * @tag access:universal
 * @tag consumers:field-visibility.ts(server),useFieldVisibility
 * @tag sideEffects:none
 */

export interface FieldVisibilityDoc {
  surfaceId: string;
  fields: Record<string, boolean>;
  updatedAt: string;
}
