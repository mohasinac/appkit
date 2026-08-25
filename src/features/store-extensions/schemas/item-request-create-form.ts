/*
 * WHY: `POST /api/item-requests` spread the raw body into Firestore, and this
 *      one is READ BY THE PUBLIC — `GET /api/item-requests` is `auth: false`
 *      and returns the open list to anyone.
 *
 *          const body = await parseJsonBody<FirestoreDocument>(request);
 *          await itemRequestsRepository.create({ ...body, opUserId, ..., replies: [], replyCount: 0 });
 *
 *      So an unvalidated write here is an unvalidated PUBLISH. A request could
 *      be created with no title and no description, and a caller could set
 *      `approvedAt` / `approvedBy` — the fields that record a moderator having
 *      cleared it.
 *
 *      `status`, `replies` and `replyCount` were pinned server-side, so the
 *      approval GATE itself held; what a caller could forge was the RECORD of
 *      approval, which is the part a human reads when deciding whether it has
 *      already been looked at.
 *
 * WHAT: The create contract — title and description required, budget bounded,
 *       and nothing a moderator owns.
 *
 * ## `maxBudget` is coerced and bounded
 *
 * It arrives from a number input as a string. Uncoerced it was written to
 * Firestore as a string, and a later numeric comparison against it would sort
 * lexically — the quiet half of the same class as the `resolvedAt` string that
 * was being written into a Date field on the reports route.
 *
 * EXPORTS: itemRequestCreateSchema, type ItemRequestCreateValues
 *
 * @tag domain:store-extensions,item-requests
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:/api/item-requests
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const itemRequestCreateSchema = z
  .object({
    title: annotate(
      z
        .string()
        .min(3, "Give the request a title of at least 3 characters.")
        .max(200, "Keep the title under 200 characters."),
      {
        section: "basics",
        sectionLabel: "What are you looking for?",
        sectionRequired: true,
        quick: true,
        order: 1,
        row: "full",
      },
    ),
    description: annotate(
      z
        .string()
        .min(10, "Describe what you're after in at least 10 characters.")
        .max(5000, "Keep the description under 5000 characters."),
      { section: "basics", quick: true, order: 2, row: "full", kind: "textarea" },
    ),
    category: annotate(z.string().max(120).optional(), {
      section: "basics",
      order: 3,
      row: "pair",
    }),
    brand: annotate(z.string().max(120).optional(), {
      section: "basics",
      order: 4,
      row: "pair",
    }),
    // Coerced — see the header. Bounded so a typo cannot record a budget that
    // reads as real money.
    maxBudget: annotate(
      z.coerce
        .number()
        .min(0, "A budget cannot be negative.")
        .max(10_000_000, "That budget looks like a typo.")
        .optional(),
      { section: "basics", order: 5, row: "pair", kind: "number" },
    ),
    imageUrls: annotate(
      z.array(z.string().url("Each image must be a URL.")).max(10).optional(),
      { section: "media", sectionLabel: "Photos", order: 1, row: "full", kind: "media" },
    ),
  })
  .strict();

export type ItemRequestCreateValues = z.infer<typeof itemRequestCreateSchema>;
