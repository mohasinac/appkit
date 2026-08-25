/*
 * WHY: `EventRaffleEntryForm` rendered `<Form>` with no schema, so a raffle
 *      entry's message was unbounded — and it is rendered back on a public
 *      leaderboard.
 *
 * ## Why this file holds ONE schema and not three
 *
 * It was drafted with three: consultation, corporate and raffle. Two of those
 * were already implemented — `bookConsultationSchema` and
 * `submitCorporateInquirySchema` have existed in their own features all along,
 * and their forms simply never used them. Adding a second copy of each would
 * have been precisely the duplication this rework exists to remove, so those
 * two were improved in place instead and only the raffle schema remains here.
 *
 * EXPORTS: raffleEntrySchema, type RaffleEntryValues
 *
 * @tag domain:events
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:EventRaffleEntryForm
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

/**
 * A raffle entry is one optional message — the entry itself is the act of
 * submitting. Bounded because the text is rendered back on a leaderboard.
 */
export const raffleEntrySchema = z.object({
  message: annotate(z.string().trim().max(500, "Keep it under 500 characters.").optional(), {
    section: "entry", sectionLabel: "Your entry", sectionRequired: true, quick: true, order: 1, row: "full", kind: "textarea",
  }),
});

export type RaffleEntryValues = z.infer<typeof raffleEntrySchema>;
