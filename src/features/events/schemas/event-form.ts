/*
 * WHY: Same reason as the blog form schema — keeping it in the `.tsx` view
 *      would have dragged a React component tree into every API route through
 *      `SCHEMAS` -> `routeHandler`.
 * WHAT: The event editor's form schema, with its UI metadata.
 *
 * EXPORTS:
 *   eventDraftSchema
 *
 * @tag domain:events
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:AdminEventEditorView,SCHEMAS.forms
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

/**
 * ## `.passthrough()` STAYS here, deliberately
 *
 * `EventDraft` carries ~40 fields; this schema names seven. The blog form's
 * equivalent was safe to tighten because its draft had fourteen fields and all
 * fourteen could be named in one sitting. This one cannot: most of its fields
 * are per-event-type (poll options, survey fields, spin prizes, raffle config)
 * and only apply under a `type` discriminator, so naming them correctly means
 * modelling the discriminated union rather than listing keys.
 *
 * Tightening it blind is the single most dangerous edit available in this
 * codebase — `z.object()` strips unknown keys, so every field this schema
 * failed to name would vanish from the draft the moment passthrough came off.
 * That is exactly how `productBaseSchema` came to eat every `classified*` /
 * `digitalCode*` / `liveItem*` / `prize*` field.
 *
 * The wire payload is NOT at risk either way: it is built explicitly below
 * (`type`, `title`, `slug`, … plus `buildEventTypeConfig` /
 * `buildEventRaffleFields`), never by spreading the draft.
 *
 * Prerequisite for removing it: a FULL-collection `roundtrip-diff --entity
 * event --full`, not a sample — per the data-integrity protocol.
 *
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const eventDraftSchema = z.object({
  type: annotate(z.string(), {
    section: "details", sectionLabel: "Details", sectionRequired: true,
    quick: true, order: 1, row: "pair", kind: "select",
  }),
  title: annotate(z.string().min(1, "Title is required"), {
    section: "details", quick: true, order: 2, row: "full",
  }),
  startsAt: annotate(z.string().min(1, "Start date is required"), {
    section: "details", quick: true, order: 3, row: "pair", kind: "date",
  }),
  endsAt: annotate(z.string().min(1, "End date is required"), {
    section: "details", quick: true, order: 4, row: "pair", kind: "date",
  }),
  couponId: annotate(z.string(), {
    section: "settings", sectionLabel: "Settings", order: 1, row: "pair",
    help: "Required for offer events.",
  }),
  displayCode: annotate(z.string(), {
    section: "settings", order: 2, row: "pair",
    help: "Required for offer events.",
  }),
  pollOptions: annotate(z.array(z.object({ id: z.string(), label: z.string() })), {
    section: "settings", order: 3, row: "full", kind: "list",
  }),
}).passthrough().superRefine((v, ctx) => {
  if (v.type === "offer") {
    if (!v.couponId.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["couponId"], message: "Coupon is required for offer events" });
    }
    if (!v.displayCode.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["displayCode"], message: "Display code is required for offer events" });
    }
  }
  if (v.type === "poll" && v.pollOptions.filter((o) => o.label.trim()).length < 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pollOptions"], message: "Poll events require at least 2 options" });
  }
});
