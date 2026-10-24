/**
 * Join class names, dropping falsy entries.
 *
 * 🛑 This is deliberately NOT named `cn`, and it is deliberately not the same function as
 * the `cn` exported from `style/tailwind`. That one runs `twMerge`, which DEDUPLICATES
 * conflicting Tailwind utilities and therefore picks a winner between them. Both Tailwind
 * configs here set `important: true`, and Root Cause #79 and #106 are both about which of
 * two competing classes wins — so quietly moving twenty components from a plain join onto
 * `twMerge` is a behaviour change in exactly the area that has already cost this project
 * two incidents.
 *
 * Three features had a byte-identical private copy of the plain join before 2026-10-24
 * (`features/filters/filterUtils.ts`, `features/forms/utils.ts`,
 * `features/media/MediaLightbox.tsx`). This is that copy, once.
 *
 * Use `cn` from `style/tailwind` when conflict resolution is wanted; use this when the
 * caller is simply assembling a list.
 */
export function joinClasses(...classes: Array<string | undefined | null | false>): string {
  return classes.filter(Boolean).join(" ");
}
