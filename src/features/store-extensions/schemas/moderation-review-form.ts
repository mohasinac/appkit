/*
 * WHY: `PATCH /api/admin/moderation/[id]` spread the raw request body straight
 *      into Firestore:
 *
 *          const body = await parseJsonBody<Record<string, JsonValue>>(request);
 *          await moderationQueueRepository.update(id, { ...body, reviewerId, reviewedAt });
 *
 *      There was no Zod anywhere on this path — not on the route, not on
 *      either of the two client surfaces that call it. Under `ROLES_ADMIN_MOD`
 *      a caller could write ANY key onto a moderation record, including
 *      `entityId`, `ownerId`, `submittedAt` or an invented one, and could set
 *      `status` to any string at all — the real `ModerationStatus` union was
 *      never consulted.
 *
 *      Two client surfaces call it and neither validated: the queue page's
 *      inline Approve/Reject controls and `ModerationDetailActions`. Both let
 *      a rejection be submitted with an EMPTY reason, so content could be
 *      blocked with no record of why.
 * WHAT: One schema shared by the route and both client surfaces.
 *
 * ## A reviewer may only set the two statuses a REVIEW produces
 *
 * `ModerationStatus` has four values, but `pending` is the initial state and
 * `auto-approved` is what the system writes when nothing needed a human. A
 * reviewer setting either by hand would be falsifying the record — so the
 * settable set is the subset below, declared `satisfies readonly
 * ModerationStatus[]` rather than restated, which makes a value outside the
 * real union a COMPILE error instead of a filter that matches nothing
 * (Recurrent Root Cause #33).
 *
 * ## `reviewerId` / `reviewedAt` are absent on purpose
 *
 * The route sets both from the session and the server clock. Accepting them
 * here would let a caller attribute a review to somebody else, or backdate it.
 *
 * EXPORTS:
 *   moderationReviewFormSchema, moderationReviewUpdateSchema,
 *   MODERATION_REVIEWER_STATUSES, type ModerationReviewFormValues
 *
 * @tag domain:store-extensions,moderation
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:admin/moderation pages,/api/admin/moderation/[id]
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import type { ModerationStatus } from "./firestore";

/**
 * The statuses a human review can produce.
 *
 * `satisfies readonly ModerationStatus[]` is load-bearing: it is what stops
 * this becoming an independent, drifting copy of the union.
 */
export const MODERATION_REVIEWER_STATUSES = [
  "approved",
  "rejected",
] as const satisfies readonly ModerationStatus[];

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const moderationReviewFormSchema = z
  .object({
    status: annotate(z.enum(MODERATION_REVIEWER_STATUSES), {
      section: "review",
      sectionLabel: "Review decision",
      sectionRequired: true,
      quick: true,
      order: 1,
      row: "pair",
    }),
    reason: annotate(z.string().max(500, "Keep the reason under 500 characters.").optional(), {
      section: "review",
      order: 2,
      row: "full",
      kind: "textarea",
      help: "Required when rejecting — this is the record of why the media was blocked.",
    }),
  })
  // Unknown keys are a 400, not a silent drop. A plain `z.object()` would
  // STRIP them, which is the quieter half of the same bug: the caller is told
  // the write succeeded and the key it sent simply vanished.
  .strict()
  .superRefine((v, ctx) => {
    // An approval needs no justification; a rejection does. Blocking someone's
    // media with an empty `reason` leaves the owner, and the next reviewer,
    // with no way to know what was wrong with it.
    if (v.status === "rejected" && !v.reason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Give a reason for the rejection.",
      });
    }
  });

export type ModerationReviewFormValues = z.infer<typeof moderationReviewFormSchema>;

/**
 * Route contract. Identical to the form contract — a review is a single
 * atomic decision, so there is no partial variant.
 */
export const moderationReviewUpdateSchema = moderationReviewFormSchema;
