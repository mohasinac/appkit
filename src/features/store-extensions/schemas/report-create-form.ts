/*
 * WHY: `POST /api/reports` — the surface any signed-in user files an abuse
 *      report through — spread the raw request body into Firestore:
 *
 *          const body = await parseJsonBody<Record<string, JsonValue>>(request);
 *          await reportsRepository.create({ ...body, reporterId, reporterEmail, status: "pending" });
 *
 *      Nothing was checked. Two distinct consequences:
 *
 *      1. An EMPTY report could be filed. `entityType`, `entityId`, `reason`
 *         and `detail` are what make a report actionable and none was
 *         required, so a row could reach the moderation queue naming nothing
 *         and describing nothing.
 *      2. A reporter could set fields that belong to the REVIEWER — a body
 *         carrying `assignedTo`, `resolution` or `resolvedAt` was written
 *         verbatim, so a user could file a report that already claimed to be
 *         resolved by a named admin.
 *
 *      `status` was pinned server-side, which is the only reason (2) was not
 *      worse than it is.
 *
 * WHAT: The create contract. Four required fields, evidence optional, and
 *       nothing a reviewer owns.
 *
 * ## `reporterId` / `reporterEmail` / `status` are absent on purpose
 *
 * The route sets all three. Accepting `reporterId` would let one user file a
 * report in another's name, which is a way to weaponise the abuse queue rather
 * than a validation nicety.
 *
 * EXPORTS: reportCreateSchema, type ReportCreateValues
 *
 * @tag domain:store-extensions,reports
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:/api/reports
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import { REPORT_ENTITY_TYPES, REPORT_REASONS } from "./firestore";

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const reportCreateSchema = z
  .object({
    entityType: annotate(z.enum(REPORT_ENTITY_TYPES), {
      section: "target",
      sectionLabel: "What are you reporting?",
      sectionRequired: true,
      quick: true,
      order: 1,
      row: "pair",
    }),
    entityId: annotate(z.string().min(1, "Tell us which item this is about."), {
      section: "target",
      quick: true,
      order: 2,
      row: "pair",
    }),
    reason: annotate(z.enum(REPORT_REASONS), {
      section: "detail",
      sectionLabel: "Why",
      sectionRequired: true,
      quick: true,
      order: 1,
      row: "pair",
    }),
    detail: annotate(
      z
        .string()
        .min(10, "Please describe the problem in at least 10 characters.")
        .max(5000, "Keep the description under 5000 characters."),
      { section: "detail", quick: true, order: 2, row: "full", kind: "textarea" },
    ),
    // Capped: an unbounded array on a user-writable document is a way to grow
    // one row past what a list read can afford (Rule #6).
    evidenceUrls: annotate(
      z.array(z.string().url("Each piece of evidence must be a URL.")).max(10).optional(),
      { section: "detail", order: 3, row: "full", kind: "list" },
    ),
  })
  .strict();

export type ReportCreateValues = z.infer<typeof reportCreateSchema>;
