/**
 * The store-creation input contract — ONE definition, shared by the form and
 * the server action that writes it.
 *
 * 🛑 Why this file exists at all. `createStoreAction` carried its own inline
 * `z.object({ storeName, storeDescription, storeCategory })` while nothing
 * rendered a form, so there was exactly one copy and no drift. The moment a
 * form exists there are two places that must agree about "2–80 characters",
 * and a client that validates more loosely than the server produces a form
 * that submits and then fails with a message pointing at no field; a client
 * that validates more strictly refuses input the server would have accepted.
 * Both are Root Cause #75's shape. The action imports this; it does not
 * restate it.
 *
 * The bounds are not new — they are lifted verbatim from the action's own
 * schema so this is a move, not a retune.
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

/**
 * 🛑 `.or(z.literal(""))` on both optional fields, matching the action.
 *
 * An untouched text input submits `""`, not `undefined`. A bare
 * `.max(80).optional()` rejects it, so a seller who filled in only the
 * required name would be refused for leaving an optional field alone — which
 * reads as a broken form, because the field they are being blocked on is one
 * they were told was optional.
 */
/*
 * 🛑 ANNOTATED, and the annotations do not change what this parses.
 *
 * `annotate()` returns the same schema and registers its UI metadata in a side
 * registry, so the server action validates exactly what it validated before.
 * That is what lets ONE schema drive both the form's sections
 * (`buildSectionsFromSchema`) and the server-side parse — the alternative is a
 * second form-only schema, which is the drift this file exists to prevent.
 *
 * One section, because there is one: a store has a name, what it sells, and a
 * category. `audit-form-sectionised` requires the fields to live in a section
 * engine rather than a bare `<Form>`, which is also what gets this step the
 * pinned mobile action bar every other form in the app has.
 */
export const storeCreateSchema = z.object({
  storeName: annotate(
    z
      .string()
      .min(2, "Store name must be at least 2 characters")
      .max(80, "Store name must be 80 characters or fewer"),
    {
      section: "store",
      sectionLabel: "Your store",
      sectionRequired: true,
      quick: true,
      order: 1,
      row: "full",
      label: "Store name",
      help: "Buyers see this. It also forms your store's web address.",
    },
  ),
  storeDescription: annotate(
    z
      .string()
      .max(10000, "Description must be 10,000 characters or fewer")
      .optional()
      .or(z.literal("")),
    {
      section: "store",
      order: 2,
      row: "full",
      kind: "textarea",
      label: "What do you sell?",
      help: "Optional. A short introduction for your storefront page.",
    },
  ),
  storeCategory: annotate(
    z
      .string()
      .max(80, "Category must be 80 characters or fewer")
      .optional()
      .or(z.literal("")),
    {
      section: "store",
      order: 3,
      row: "full",
      label: "Main category",
      help: "Optional. Helps buyers browsing that category find your store.",
    },
  ),
});

export type StoreCreateInput = z.infer<typeof storeCreateSchema>;

/** Field names, so a form and an error path cannot disagree by typo. */
export const STORE_CREATE_FIELDS = {
  STORE_NAME: "storeName",
  STORE_DESCRIPTION: "storeDescription",
  STORE_CATEGORY: "storeCategory",
} as const;
