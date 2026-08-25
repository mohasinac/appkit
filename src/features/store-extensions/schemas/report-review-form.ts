/*
 * WHY: `PATCH /api/admin/reports/[id]` spread the raw request body straight
 *      into Firestore, exactly as the moderation route did:
 *
 *          const body = await parseJsonBody<Record<string, JsonValue>>(request);
 *          await reportsRepository.update(id, { ...body, assignedTo: user.uid });
 *
 *      No Zod on the route, none on either client surface. `status` was never
 *      checked against the real `ReportStatus` union, and any key at all could
 *      be written onto a report — `reporterId`, `entityId`, `evidenceUrls`,
 *      or something invented.
 *
 * ## 🛑 And it was actively corrupting `resolvedAt`
 *
 *      BOTH client surfaces — the list page's inline controls and
 *      `ReportDetailActions` — sent:
 *
 *          resolvedAt: status === "actioned" || status === "dismissed"
 *            ? new Date() : undefined
 *
 *      `new Date()` does not survive `JSON.stringify`. It arrives at the route
 *      as an ISO **string**, and the raw spread wrote that string into a field
 *      `ReportDocument` declares as `Date`. Seeded reports hold real
 *      Timestamps, so the collection carries BOTH shapes for one field —
 *      the sort of split that later reads as "the date filter is broken" long
 *      after the cause is out of sight (Recurrent Root Cause #47).
 *
 *      Nothing renders `resolvedAt` today, which is the only reason it was
 *      never noticed. It is a latent corruption, not a cosmetic one.
 *
 * WHAT: One schema shared by the route and both client surfaces — and
 *       `resolvedAt` is REMOVED from the client contract entirely. The server
 *       stamps it, the same way the moderation route already stamps
 *       `reviewedAt`. A timestamp the client cannot send is a timestamp the
 *       client cannot send in the wrong type.
 *
 * ## A reviewer may only set the three statuses a REVIEW produces
 *
 * `ReportStatus` has four values; `pending` is the state a report is born in.
 * The settable subset is declared `satisfies readonly ReportStatus[]` rather
 * than restated, so a value outside the real union is a COMPILE error instead
 * of a filter that silently matches nothing (Recurrent Root Cause #33).
 *
 * EXPORTS:
 *   reportReviewFormSchema, reportReviewUpdateSchema,
 *   REPORT_REVIEWER_STATUSES, REPORT_TERMINAL_STATUSES,
 *   type ReportReviewFormValues
 *
 * @tag domain:store-extensions,reports
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:admin/reports pages,/api/admin/reports/[id]
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import type { ReportStatus } from "./firestore";

/** The statuses a human review can produce. `pending` is the initial state. */
export const REPORT_REVIEWER_STATUSES = [
  "under-review",
  "actioned",
  "dismissed",
] as const satisfies readonly ReportStatus[];

/**
 * The two that CLOSE a report — the server stamps `resolvedAt` for these and
 * for no others. Exported so the route and any future consumer share one
 * answer to "is this report finished", rather than each spelling out the pair.
 */
export const REPORT_TERMINAL_STATUSES = [
  "actioned",
  "dismissed",
] as const satisfies readonly ReportStatus[];

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const reportReviewFormSchema = z
  .object({
    status: annotate(z.enum(REPORT_REVIEWER_STATUSES), {
      section: "review",
      sectionLabel: "Report decision",
      sectionRequired: true,
      quick: true,
      order: 1,
      row: "pair",
    }),
    resolution: annotate(z.string().max(1000, "Keep the resolution under 1000 characters.").optional(), {
      section: "review",
      order: 2,
      row: "full",
      kind: "textarea",
      help: "Required when actioning or dismissing — the reporter may see a summary.",
    }),
    // `resolvedAt` is deliberately NOT a field. See the header.
  })
  .strict()
  .superRefine((v, ctx) => {
    // Taking a report for review needs no note; closing one does. "Actioned"
    // with an empty resolution tells the reporter, and the next admin, nothing
    // about what was actually done.
    if (
      (REPORT_TERMINAL_STATUSES as readonly string[]).includes(v.status) &&
      !v.resolution?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resolution"],
        message: "Say what was done about this report before closing it.",
      });
    }
  });

export type ReportReviewFormValues = z.infer<typeof reportReviewFormSchema>;

/** Route contract — identical; a review is one atomic decision. */
export const reportReviewUpdateSchema = reportReviewFormSchema;
