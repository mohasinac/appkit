/*
 * WHY: `POST /api/store/grouped-listings` spread the raw request body into
 *      `.create()` and its PATCH built `{...body}` — no Zod on either. The two
 *      pages behind them validated one field between them (`new` checked
 *      `title` was non-empty and toasted; `[id]/edit` checked nothing at all).
 * WHAT: One schema for the pages AND the store routes.
 *
 * ## `activeMemberCount` is NOT in this schema
 *
 * It is derived — both routes already recompute it from `productIds.length`,
 * which is correct and was verified rather than assumed. Accepting it from the
 * body would let a caller set a count that disagrees with the array, and the
 * count is what the public visibility check reads.
 *
 * `slug`, `visibilityStatus` and `createdBy` are absent for the same reason:
 * derived or session-owned, never typed.
 *
 * EXPORTS:
 *   groupedListingFormSchema, groupedListingCreateSchema,
 *   groupedListingUpdateSchema, type GroupedListingFormValues
 *
 * @tag domain:grouped
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:store/grouped-listings pages,/api/store/grouped-listings
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

/** Mirrors `GroupTheme` in ./firestore. */
const groupThemeSchema = z.enum(["related", "character", "lineage", "set", "generic"]);

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const groupedListingFormSchema = z.object({
  title: annotate(z.string().min(1, "Title is required").max(120, "Keep the title under 120 characters."), {
    section: "basics", sectionLabel: "Group", sectionRequired: true,
    quick: true, order: 1, row: "full",
  }),
  description: annotate(z.string().max(500, "Keep the description under 500 characters.").optional(), {
    section: "basics", order: 2, row: "full",
  }),
  groupTheme: annotate(groupThemeSchema, {
    section: "basics", quick: true, order: 3, row: "pair",
  }),

  productIds: annotate(z.array(z.string()), {
    section: "members", sectionLabel: "Members", order: 1, row: "full", kind: "list",
  }),
  minActiveMembers: annotate(
    z.coerce.number().int("Must be a whole number.").min(1, "A group needs at least one member to show."),
    {
      section: "members", order: 2, row: "pair",
      help: "Below this many in-stock members, the group hides itself.",
    },
  ),

  coverImage: annotate(z.string().optional(), {
    section: "media", sectionLabel: "Media", order: 1, row: "full", kind: "media",
  }),

  isActive: annotate(z.boolean(), {
    section: "visibility", sectionLabel: "Visibility", order: 1, row: "quarter",
  }),
  isFeatured: annotate(z.boolean(), {
    section: "visibility", order: 2, row: "quarter",
  }),
});

export type GroupedListingFormValues = z.infer<typeof groupedListingFormSchema>;

/**
 * Create contract. `storeId` is absent — the store route sets it from the
 * session, so a seller cannot file a group under another store.
 */
export const groupedListingCreateSchema = groupedListingFormSchema.partial({
  description: true,
  coverImage: true,
  isFeatured: true,
  minActiveMembers: true,
});

/** Update contract — partial, `.strict()` so an unknown key is a 400. */
export const groupedListingUpdateSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    description: z.string().max(500).optional(),
    groupTheme: groupThemeSchema.optional(),
    productIds: z.array(z.string()).optional(),
    minActiveMembers: z.coerce.number().int().min(1).optional(),
    coverImage: z.string().optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    brandSlug: z.string().optional(),
    categorySlug: z.string().optional(),
  })
  .strict();
