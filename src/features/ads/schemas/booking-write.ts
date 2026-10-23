/**
 * The write contract for a self-serve ad booking.
 *
 * ## 🛑 The shape cannot express moderation, payment or price
 *
 * This is Root Cause #76's rule applied to a surface where the submitter is
 * a member of the public rather than an admin, which makes it sharper: an
 * advertiser who can send `moderation: { state: "approved" }` has not
 * bypassed a check, they have *become* the check. A schema that merely
 * VALIDATED the field would still let `"approved"` through — the field has
 * to be unrepresentable, so `.strict()` turns it into a 400 instead of
 * something the server has to remember to overwrite.
 *
 * Same for `priceRs` (the server reads the rate card; a client-supplied
 * price is a ₹1 banner) and `paymentState` (a booking that declares itself
 * paid is a free slot).
 *
 * `placementId` and `period` ARE accepted: they are what is being bought,
 * and they are also the booking's identity, so the conflict they can cause
 * is a document collision rather than a validation question.
 */

import { z } from "zod";
import { isAdPeriod } from "./firestore";

/**
 * 🛑 Creative fields are bounded, and `ctaHref` is http(s)-only.
 *
 * An unbounded `body` is a storage cost per booking and a layout break on
 * every page carrying the slot. A `javascript:` or `data:` CTA is script
 * execution on every page the creative renders on, submitted by a member of
 * the public — this is the one field on this schema where a miss is a
 * security defect rather than a tidiness one.
 */
/*
 * Exported so `creative-form.ts` reuses the REFINEMENT rather than restating
 * it — the form and the wire must agree on what a link is, and a second copy
 * of a security check is a second thing to forget.
 */
export const httpUrl = z
  .string()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), "Links must start with http:// or https://");

export const adBookingCreativeSchema = z
  .object({
    title: z.string().min(2).max(80),
    body: z.string().max(200).optional(),
    imageUrl: httpUrl.optional(),
    ctaLabel: z.string().max(40).optional(),
    ctaHref: httpUrl.optional(),
  })
  .strict();

export const adBookingWriteSchema = z
  .object({
    placementId: z.string().min(1).max(80),
    period: z.string().refine(isAdPeriod, "Pick a month, as YYYY-MM."),
    creative: adBookingCreativeSchema,
  })
  .strict();

export type AdBookingWriteInput = z.infer<typeof adBookingWriteSchema>;

/**
 * A moderator's verdict.
 *
 * 🛑 A rejection REQUIRES a note, for the same reason an admin offer-cancel
 * does: without one the advertiser's next submission is the same creative
 * again, and the moderator reviews it twice. An approval takes no note
 * because there is nothing to say.
 */
export const adModerationSchema = z
  .object({
    approve: z.boolean(),
    note: z.string().max(300).optional(),
  })
  .strict()
  .refine((v) => v.approve || (v.note?.trim().length ?? 0) >= 10, {
    message: "Say why it was rejected — the advertiser sees this and will resubmit without it.",
    path: ["note"],
  });

export type AdModerationInput = z.infer<typeof adModerationSchema>;

/*
 * The resubmit body — the creative alone, under the key the route reads.
 *
 * 🛑 Declared HERE rather than rebuilt at the route, and the reason is a type
 * rather than tidiness: a locally-written `z.object({ creative:
 * adBookingCreativeSchema }).strict()` loses the inner type under this repo's
 * zod, so `body!.creative` arrives as `unknown` and the handler cannot pass it
 * to `resubmitAdCreative`. The sibling POST route works precisely because it
 * uses a published schema's own `_output`; this gives PATCH the same.
 */
export const adCreativeResubmitSchema = z
  .object({ creative: adBookingCreativeSchema })
  .strict();
