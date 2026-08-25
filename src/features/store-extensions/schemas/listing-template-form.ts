/*
 * WHY: `/store/listing-templates/[id]/edit` was a wholly broken page. The route
 *      it calls — `/api/store/listing-templates/[id]` — did not exist, while
 *      `src/constants/api.ts` defined the endpoint, the edit page called it
 *      three times (GET on load, PATCH on save, DELETE), and the list page
 *      rendered an Edit button pointing straight at it. A seller clicking Edit
 *      got a page that 404'd on load, on save and on delete.
 *      Root Cause #37's dead-route shape, with a real page and a real button
 *      in front of it.
 * WHAT: One schema for the listing-template form AND the route that receives
 *       it, so the two cannot drift.
 *
 * ## `defaults` stays open on purpose
 *
 * It is a JSON blob of per-listing-type field defaults — the whole point is
 * that it holds whatever fields the target listing type has. `z.record()`
 * rather than a named shape: modelling it would mean restating every listing
 * type's field set here, and getting that wrong strips a seller's saved
 * defaults on the next save (`z.object()` drops unknown keys). The page
 * already `JSON.parse`s it and reports malformed JSON.
 *
 * EXPORTS:
 *   listingTemplateFormSchema, listingTemplateCreateSchema,
 *   listingTemplateUpdateSchema, type ListingTemplateFormValues
 *
 * @tag domain:store-extensions
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:store/listing-templates pages,/api/store/listing-templates
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import { LISTING_TEMPLATE_TYPES } from "./firestore";
import { firestoreValueSchema } from "../../../schemas/firestore-value";


/**
 * Derived from the runtime array, never restated. A hand-written copy here
 * would be the eleventh independent enumeration of this union — and the tenth
 * had already drifted, which is how `art`/`stickers` came to be unsaveable as
 * templates while `bundle` lingered.
 */
const listingTemplateTypeSchema = z.enum(LISTING_TEMPLATE_TYPES);

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const listingTemplateFormSchema = z.object({
  name: annotate(z.string().min(1, "Name is required").max(120, "Keep the name under 120 characters."), {
    section: "basics", sectionLabel: "Template", sectionRequired: true,
    quick: true, order: 1, row: "full",
  }),
  description: annotate(z.string().max(500, "Keep the description under 500 characters.").optional(), {
    section: "basics", order: 2, row: "full",
  }),
  listingType: annotate(listingTemplateTypeSchema, {
    section: "basics", quick: true, order: 3, row: "pair",
  }),
  // Typed as a Firestore value tree, not `unknown`: `unknown` does not satisfy
  // `ListingTemplateDocument.defaults` (a `FirestoreDocument`), and casting at
  // the repository call to paper over that would defeat the only type-level
  // signal that the shapes agree.
  defaults: annotate(z.record(firestoreValueSchema), {
    section: "defaults", sectionLabel: "Default field values",
    order: 1, row: "full", kind: "list",
    help: "JSON applied to a new listing when this template is chosen.",
  }),
  isShared: annotate(z.boolean(), {
    section: "visibility", sectionLabel: "Visibility", order: 1, row: "quarter",
  }),
  isActive: annotate(z.boolean(), {
    section: "visibility", order: 2, row: "quarter",
  }),
});

export type ListingTemplateFormValues = z.infer<typeof listingTemplateFormSchema>;

/**
 * Create contract. `storeId`/`ownerId` are deliberately absent: the route sets
 * both from the session, so a caller cannot create a template inside someone
 * else's store by adding a field to the body.
 */
export const listingTemplateCreateSchema = listingTemplateFormSchema.partial({
  description: true,
  isShared: true,
  isActive: true,
  defaults: true,
});

/** Update contract — every field optional, and the same ownership fields absent. */
export const listingTemplateUpdateSchema = listingTemplateFormSchema.partial();
