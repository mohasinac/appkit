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
 *   makeOfferFormSchema, type MakeOfferFormValues
 *   cancelOfferFormSchema, type CancelOfferFormValues
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

/**
 * Buyer-side Make-an-Offer form.
 *
 * A factory rather than a constant because both bounds depend on the listing:
 * the floor is `minOfferAmount(listedPrice, minOfferPercent)` and the ceiling is
 * the listed price itself. Both are re-checked server-side in `makeOffer` — this
 * exists so the buyer is told before submitting, using the SAME
 * `minOfferAmount()` the server uses, rather than a second rounding rule that
 * could disagree by a rupee.
 */
export function makeOfferFormSchema(opts: {
  listedPrice: number;
  minOffer: number;
  formatAmount: (n: number) => string;
}) {
  const { listedPrice, minOffer, formatAmount } = opts;
  return z.object({
    offerAmount: z.coerce
      .number({ invalid_type_error: "Enter an offer amount." })
      .positive("Offer amount must be greater than zero.")
      .min(minOffer, `Minimum offer is ${formatAmount(minOffer)}.`)
      .max(
        listedPrice - 0.01,
        `Offer must be below the listed price of ${formatAmount(listedPrice)} — use Add to Cart to buy at that price.`,
      ),
    buyerNote: z.string().max(300, "Keep your note under 300 characters.").optional(),
  });
}

export type MakeOfferFormValues = z.infer<ReturnType<typeof makeOfferFormSchema>>;

/**
 * Admin cancel-offer form.
 *
 * A bare confirm dialog was the wrong control here. Admin cancel is an
 * escalation over the store's own authority, and it lands in three permanent
 * places at once — the buyer's notification, the offer's own status history,
 * and `adminAuditLog`. All three are useless without a reason, and the route
 * used to accept an optional one and never read it.
 *
 * The 10-character floor mirrors the server schema exactly. Stating it in both
 * places is deliberate: the client bound exists so the admin is told before
 * submitting, not so the server can trust it.
 */
export const cancelOfferFormSchema = z.object({
  reason: z
    .string()
    .min(10, "Give a reason of at least 10 characters — the buyer sees this.")
    .max(300, "Keep the reason under 300 characters."),
});

export type CancelOfferFormValues = z.infer<typeof cancelOfferFormSchema>;
