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

import type { OfferBounds } from "../../../_internal/shared/features/offers/config";

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
 * A factory rather than a constant because both bounds depend on the listing.
 * It takes the already-resolved `OfferBounds` rather than recomputing them:
 * `resolveOfferBounds()` is what `makeOffer` enforces, so anything this schema
 * accepts, the server accepts. Deriving a second floor here is exactly how the
 * forms came to advertise a 50% minimum the server rejected at 70 (see the
 * offers config header).
 *
 * Three shapes, all from the same bounds object:
 *
 * - **Buy request** (`isBuyRequest`) — no cart on this type and no haggling
 *   opted in, so `min === max` and the only legal amount is the asking price.
 * - **Offer, no cart** — floor to asking price *inclusive*: with no Add to Cart
 *   button, refusing a full-price offer would leave the buyer nowhere to go.
 * - **Offer, cartable** — the original rule, ceiling exclusive of the price.
 */
export function makeOfferFormSchema(opts: {
  listedPrice: number;
  bounds: OfferBounds;
  formatAmount: (n: number) => string;
}) {
  const { listedPrice, bounds, formatAmount } = opts;

  const amount = z.coerce
    .number({ invalid_type_error: "Enter an offer amount." })
    .positive("Offer amount must be greater than zero.");

  const bounded = bounds.isBuyRequest
    ? amount
        .min(bounds.min, `This seller is not taking lower offers — the price is ${formatAmount(bounds.min)}.`)
        .max(bounds.max, `This seller is not taking lower offers — the price is ${formatAmount(bounds.max)}.`)
    : amount
        .min(bounds.min, `Minimum offer is ${formatAmount(bounds.min)}.`)
        .max(
          bounds.max,
          bounds.max >= listedPrice
            ? `Your offer cannot exceed the asking price of ${formatAmount(listedPrice)}.`
            : `Offer must be below the listed price of ${formatAmount(listedPrice)} — use Add to Cart to buy at that price.`,
        );

  return z.object({
    offerAmount: bounded,
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
