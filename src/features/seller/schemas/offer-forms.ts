/*
 * WHY: Rule #9 — every appkit form is schema-driven. The seller's counter-offer
 *      drawer had no form at all before 2026-08-21 (the view took an
 *      `(id) => void` callback and left each consumer to invent an input), so
 *      `respondToOffer`'s counter branch had zero real callers.
 * WHAT: Zod schema for the counter-offer QuickFormDrawer. Deliberately only the
 *       field-shape rules that can be checked without loading the offer — the
 *       relational rules (below listed price, different from the buyer's offer)
 *       stay server-side in `respondToOffer`, which is the only place that can
 *       be trusted with them.
 *
 * EXPORTS:
 *   counterOfferFormSchema, type CounterOfferFormValues
 *
 * @tag domain:seller,offers
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:SellerOffersView
 * @tag sideEffects:none
 */

import { z } from "zod";

export const counterOfferFormSchema = z.object({
  counterAmount: z.coerce
    .number({ invalid_type_error: "Enter a counter amount." })
    .positive("Counter amount must be greater than zero."),
  sellerNote: z.string().max(500, "Keep your note under 500 characters.").optional(),
});

export type CounterOfferFormValues = z.infer<typeof counterOfferFormSchema>;
