/**
 * D55 — write shapes for the pre-order balance collector.
 *
 * 🛑 Both are `.strict()`, and that is the Root Cause #76 lesson rather than
 * tidiness: the balance block carries `status`, `reviewedBy`, `reviewedAt`
 * and `amount`, and a write shape that can NAME a field is a write shape that
 * can destroy it. A buyer must not be able to send `status: "paid"` or
 * `amount: 1`, and `z.object()` merely STRIPS unknown keys — which is the
 * same silent-success failure as the grouped-listings PATCH. `.strict()`
 * makes it a 400 instead.
 *
 * Neither schema is where `amount` comes from. It is snapshotted from
 * `sourceContext.balanceDue` when the seller opens collection, months before
 * this, and is never re-read from the live product (D61).
 */

import { z } from "zod";

/** The buyer's proof of payment. */
export const balanceProofSchema = z
  .object({
    /*
     * A `/media/…` slug from the signed-URL upload flow — bytes never reach
     * this route (Rule #6's 4.5 MB payload cap, and § Media Architecture).
     */
    proofUrl: z.string().min(1, "Upload a screenshot of the payment."),
    /*
     * The UTR or UPI reference. Required, because it is the only thing an
     * admin can check the payment against — a screenshot alone is a picture.
     */
    transactionId: z
      .string()
      .min(4, "Enter the transaction reference from your bank or UPI app.")
      .max(64),
  })
  .strict();

export type BalanceProofInput = z.infer<typeof balanceProofSchema>;

/** The admin's verdict on a submitted proof. */
export const balanceReviewSchema = z
  .object({
    approve: z.boolean(),
    /*
     * Optional HERE and required in `reviewBalanceProof` when `approve` is
     * false. Deliberately not a `.refine()`: the rule belongs with the
     * transition it guards, and duplicating it would give two places to
     * disagree. An approval genuinely needs no note.
     */
    note: z.string().max(300).optional(),
  })
  .strict();

export type BalanceReviewInput = z.infer<typeof balanceReviewSchema>;
