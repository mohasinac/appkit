/*
 * WHY: `/store/categories/new` collected five fields through raw <Input>s with
 *      no <Form>, no schema and no check of any kind, and `POST
 *      /api/store/categories` spread the raw request body straight into
 *      `storeCategoriesRepository.create()`. Neither side validated anything,
 *      so an entirely empty storefront category could be created — and any
 *      extra key a caller sent was written verbatim into Firestore.
 * WHAT: One schema for both sides. The client parses it to show inline errors
 *       before submitting; the route parses it to decide what is allowed to
 *       reach the database.
 *
 * ## Why one schema and not two
 *
 * A client copy and a server copy of the same rules is how they come to
 * disagree — and when they do, the client's is the one users see while the
 * server's is the one that decides. The route strips unknown keys BECAUSE it
 * parses this: `storeId` is set from the session, never from the body, so a
 * caller cannot write a category into someone else's store by adding a field.
 *
 * `productIds` and `isActive` are deliberately absent: they are managed after
 * creation (assigning products, toggling visibility), not typed into the
 * create form, and the repository supplies their defaults.
 *
 * EXPORTS:
 *   storeCategoryFormSchema, storeCategoryCreateSchema,
 *   type StoreCategoryFormValues
 *
 * @tag domain:store-extensions
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:store/categories/new,POST /api/store/categories
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one, so annotating
 * before `.optional()` silently loses the metadata.
 */
export const storeCategoryFormSchema = z.object({
  label: annotate(z.string().min(1, "Label is required").max(80, "Keep the label under 80 characters."), {
    section: "basics", sectionLabel: "Category", sectionRequired: true,
    quick: true, order: 1, row: "full",
  }),
  slug: annotate(z.string().max(80, "Keep the slug under 80 characters.").optional(), {
    section: "basics", order: 2, row: "full",
    // T1 calculated: derived from the label when left blank, then frozen —
    // the same create-only rule every other slug in this codebase follows,
    // because renaming one breaks inbound links.
    tier: "t1-derive",
    help: "Left blank, this is generated from the label.",
  }),
  description: annotate(z.string().max(500, "Keep the description under 500 characters.").optional(), {
    section: "basics", order: 3, row: "full",
  }),
  coverImageUrl: annotate(z.string().optional(), {
    section: "media", sectionLabel: "Media", order: 1, row: "full", kind: "media",
  }),
  displayOrder: annotate(
    z.coerce.number().int("Display order must be a whole number.").min(0, "Display order cannot be negative."),
    { section: "visibility", sectionLabel: "Visibility", order: 1, row: "pair" },
  ),
});

export type StoreCategoryFormValues = z.infer<typeof storeCategoryFormSchema>;

/**
 * The server's create contract.
 *
 * Identical fields, but `slug` is REQUIRED here: the client derives it from
 * the label when blank, and a category with no slug has no URL. Keeping the
 * derivation on the client and the requirement on the server means the route
 * never has to guess what the user meant.
 */
export const storeCategoryCreateSchema = storeCategoryFormSchema.extend({
  slug: z.string().min(1, "Slug is required").max(80),
});
