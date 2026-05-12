/**
 * Shared seed-side constants for bundle fixtures. Kept out of feature code so
 * the seed package doesn't leak fixture-only IDs into runtime imports.
 */

/** Slug-prefix enforced on every bundle document. */
export const BUNDLE_PREFIX = "bundle-" as const;

/**
 * Minimum + maximum items per bundle — mirrored from the Zod schema in
 * `appkit/src/features/products/schemas/index.ts`. Re-declared here to keep the
 * seed authoring assertions self-contained (a test util can `expect(items.length)
 * .toBeGreaterThanOrEqual(BUNDLE_MIN_ITEMS)`).
 */
export const BUNDLE_MIN_ITEMS = 3 as const;
export const BUNDLE_MAX_ITEMS = 16 as const;
