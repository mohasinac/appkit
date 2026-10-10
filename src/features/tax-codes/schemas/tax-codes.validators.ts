/**
 * Zod validators for the `/api/admin/tax-codes` route handlers.
 *
 * Separate from `tax-code-form.ts`, which is the EDITOR's schema: that one is
 * annotated for `buildSectionsFromSchema`, takes strings from inputs, and
 * coerces. These are the wire contracts, and they are `.strict()`.
 *
 * ## 🛑 `.strict()`, not `z.object()` and not `.passthrough()`
 *
 * `z.object()` STRIPS unknown keys, which is how a PATCH returns 200 having
 * written nothing (Root Cause #40's shape, and the admin grouped-listings
 * route's documented bug). `.passthrough()` writes whatever arrives, which is
 * how a form overwrote booked lottery slots. `.strict()` 400s on a field the
 * contract does not name — the caller is told, and nothing silently vanishes.
 *
 * ## The id is NOT accepted on update
 *
 * `createTaxCodeId` derives the id from the HSN code, so accepting an id (or
 * re-deriving one on update) would let an edit orphan every
 * `CategoryProductDefaults.taxCodeId` pointing at the old one — with a GST
 * invoice at the end of that chain. To correct a wrong HSN: deactivate, create
 * the right row, repoint the categories.
 */

import { z } from "zod";
import { GST_RATE_VALUES } from "./firestore";

const LABEL_MAX = 150;
const DESCRIPTION_MAX = 500;
const NOTES_MAX = 1000;

/**
 * 🛑 `z.custom<GstRate>`, not `z.number().refine(...)`.
 *
 * A `.refine()` validates at runtime and does NOT narrow the inferred type —
 * the payload still types as `number`, so `repository.create(body)` fails to
 * compile against `gstRate: GstRate`, and the obvious unblock is a cast. A
 * cast at a request boundary is where this codebase's worst bugs live (an
 * `ActionResult` envelope spread as a product, a raw `StoreDocument` published
 * as HTML), so the type is narrowed here instead.
 *
 * And `z.custom` rather than a hand-written `z.union([z.literal(0), …])`
 * because the slab list then has ONE definition — `GST_RATE_VALUES`, which
 * `ProductDocument.gstRate` and the form's option list also derive from. A
 * literal union here would be a second enumeration of the same union, which is
 * Root Cause #61's shape.
 */
export const GST_RATE_ENUM = z.custom<(typeof GST_RATE_VALUES)[number]>(
  (v) => typeof v === "number" && (GST_RATE_VALUES as readonly number[]).includes(v),
  { message: "gstRate must be one of 0, 5, 12, 18 or 28." },
);

export const HSN_CHAPTER_ENUM = z.enum(["9503", "4911", "9504", "exempt"]);

/**
 * 🛑 `hsnCode` is OPTIONAL here and the blank-only-at-0% rule lives in the
 * repository, not this schema. Deliberate: the same rule has to hold for the
 * seed path and any future importer, neither of which goes through a Zod
 * request schema. A rule enforced only at the HTTP edge is a rule with a side
 * door.
 */
export const taxCodeCreateSchema = z
  .object({
    /*
     * Omitted becomes `""`, not `undefined`, because `TaxCodeDocument.hsnCode`
     * is REQUIRED and the exemption row's value genuinely is the empty string.
     * An optional-into-required field here would force a cast at the one call
     * site, and "no HSN" and "nobody filled this in" would become
     * indistinguishable — exactly the `undefined`-vs-`0` distinction `gstRate`
     * depends on, one field over.
     */
    hsnCode: z.string().trim().max(8).default(""),
    label: z.string().trim().min(1).max(LABEL_MAX),
    description: z.string().max(DESCRIPTION_MAX).optional(),
    gstRate: GST_RATE_ENUM,
    chapter: HSN_CHAPTER_ENUM.optional(),
    effectiveFrom: z.coerce.date().optional(),
    isActive: z.boolean().default(true),
    notes: z.string().max(NOTES_MAX).optional(),
  })
  .strict();

export type TaxCodeCreatePayload = z.infer<typeof taxCodeCreateSchema>;

export const taxCodeUpdateSchema = z
  .object({
    hsnCode: z.string().trim().max(8).optional(),
    label: z.string().trim().min(1).max(LABEL_MAX).optional(),
    description: z.string().max(DESCRIPTION_MAX).optional(),
    gstRate: GST_RATE_ENUM.optional(),
    chapter: HSN_CHAPTER_ENUM.optional(),
    effectiveFrom: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
    notes: z.string().max(NOTES_MAX).optional(),
  })
  .strict();

export type TaxCodeUpdatePayload = z.infer<typeof taxCodeUpdateSchema>;
