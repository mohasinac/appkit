/*
 * WHY: `/advertise` rendered four hand-wired `<FieldInput>`s inside a bare
 *      `<Form>`, so the advertiser's creative had no client-side bounds at
 *      all — the only limits were the ones `adBookingCreateSchema` enforces
 *      server-side, which the visitor meets as a 400 after submitting. A
 *      headline is the single most visible string this platform renders to
 *      strangers; it should not be the one field with no feedback until POST.
 *
 * WHAT: The FLAT form shape for the booking creative, annotated so
 *       `buildSectionsFromSchema` produces the fields. The wire shape nests
 *       these under `creative` (see `booking-write.ts`); the page lifts them
 *       at submit.
 *
 * 🛑 It deliberately does NOT carry `placementId` or `period`. Those are
 * chosen by clicking a month in the rate card, not typed — and more to the
 * point, a slot whose availability the server has already decided must not
 * become a text input the advertiser can edit. The booking id IS the lock
 * (`adBookingId`), so a typed period is a way to aim at somebody else's slot.
 *
 * 🛑 Bounds mirror `adCreativeSchema` exactly. Two numbers that merely happen
 * to agree today would drift into a form that accepts what the route refuses,
 * which is the worse of the two failures: it looks like a server fault.
 *
 * EXPORTS: adCreativeFormSchema, type AdCreativeFormValues
 *
 * @tag domain:ads
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:/advertise
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import { httpUrl } from "./booking-write";

export const adCreativeFormSchema = z.object({
  title: annotate(
    z.string().trim().min(2, "A headline is required.").max(80, "Keep the headline under 80 characters."),
    { section: "creative", sectionLabel: "Your creative", sectionRequired: true, quick: true, order: 1, row: "full" },
  ),
  body: annotate(
    z.string().trim().max(200, "Keep the body under 200 characters.").optional(),
    { section: "creative", order: 2, row: "full", kind: "textarea" },
  ),
  ctaLabel: annotate(
    z.string().trim().max(40, "Keep the button text under 40 characters.").optional(),
    { section: "creative", order: 3, row: "pair" },
  ),
  /*
   * 🛑 `httpUrl`, the same refinement the wire schema uses — a `javascript:`
   * or `data:` CTA on a page we render to strangers is stored XSS with our
   * own domain's credibility behind it. An empty string is allowed through so
   * clearing the field is not an error; the page drops it before POST.
   */
  ctaHref: annotate(z.union([z.literal(""), httpUrl]).optional(), {
    section: "creative",
    order: 4,
    row: "pair",
  }),
});

export type AdCreativeFormValues = z.infer<typeof adCreativeFormSchema>;
