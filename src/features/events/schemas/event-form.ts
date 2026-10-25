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
import { attachedCouponIdsSchema } from "../../promotions/schemas/attached-coupons";

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
  /*
   * Named explicitly even though this object is `.passthrough()` and would
   * carry them regardless — passthrough preserves a value, it does not
   * VALIDATE one. Without these two entries the cap would be enforced only by
   * the API route, so an admin who picked eleven coupons would fill the form,
   * hit Save, and be told by a 400 what the field could have told them while
   * they were still looking at it.
   *
   * 🛑 `couponIds` (promotional, shown to every reader) and
   * `rafflePrizeCouponIds` (awarded to one winner) are DIFFERENT fields on
   * purpose — see `EventDocument`. They share a schema, never a value.
   */
  couponIds: annotate(attachedCouponIdsSchema, {
    section: "settings", order: 4, row: "full", kind: "list",
  }),
  rafflePrizeCouponIds: annotate(attachedCouponIdsSchema, {
    section: "raffle", sectionLabel: "Raffle & Spin Wheel", order: 5, row: "full", kind: "list",
  }),
  /*
   * Whether this event is published to the homepage hero rail.
   *
   * 🛑 SEPARATE FROM THE SLIDE'S CONTENT (`carouselConfig`), which is the
   * whole reason the field exists — see `EventDocument.showOnCarousel`. The
   * publish decision is a one-click toggle an editor can reverse without
   * touching artwork; the artwork is a nested discriminated union they should
   * not have to open in order to pull a promotion off the front page.
   *
   * `.optional()` so absent keeps meaning "not on the rail", and so every
   * event saved before this field existed round-trips unchanged — a required
   * boolean here would make the admin editor refuse to save any of them.
   */
  showOnCarousel: annotate(z.boolean().optional(), {
    section: "settings", order: 6, row: "pair", kind: "toggle",
    help: "Show this event as a slide on the homepage carousel. Needs carousel artwork to be configured.",
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
