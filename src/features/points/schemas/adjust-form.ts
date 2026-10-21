import { z } from "zod";

import { POINTS_ADJUSTMENT_MAX, POINTS_ADJUSTMENT_REASON_MIN } from "./firestore";

/**
 * The write contract for a manual points adjustment.
 *
 * ## 🛑 This creates or destroys SPENDABLE MONEY
 *
 * 1 point = ₹1 against a future order, so a credit here is a liability the
 * platform has to honour and a debit takes value a buyer already holds. That
 * is why this is the one ledger kind whose invariant
 * (`isPointsEntryWellFormed`) demands a reason, and why the schema adds two
 * things the invariant cannot express.
 *
 * ## 🛑 A CAP, because the realistic failure is a typo
 *
 * The invariant checks sign and reason, not magnitude — so `50000` where `500`
 * was meant passes every existing check and mints ₹50,000 of liability in one
 * click. `POINTS_ADJUSTMENT_MAX` bounds a single adjustment; a genuinely larger
 * correction is several deliberate ones, each with its own reason and its own
 * audit row, which is the right amount of friction for a number that size.
 *
 * The bound is on the ABSOLUTE value, so it guards the debit direction too: a
 * mistyped debit wipes a balance the buyer earned and there is no undo beyond
 * another adjustment.
 *
 * ## The reason is for the BUYER'S case file, not for us
 *
 * `adminReason` is never shown to the buyer (the schema says so), so its reader
 * is the next admin asking "why does this account have 53 points". A reason
 * like "fix" answers nothing, which is why the floor is a length rather than
 * mere presence — the same reasoning as `paymentCaseResolveFormSchema`'s
 * 10-character floor, and deliberately the same number so an operator meets one
 * rule rather than two.
 *
 * 🛑 `amount` is SIGNED here, unlike `redeem()` which takes a positive and
 * stores a negative. An adjustment genuinely goes both ways and the sign IS the
 * intent, so hiding it behind a separate direction field would mean two inputs
 * that can disagree. `.refine` rejects zero rather than letting `append()`
 * throw on it, so the operator gets a field error instead of a 500.
 */
export const pointsAdjustFormSchema = z
  .object({
    userId: z.string().trim().min(1, "Pick a user."),
    amount: z
      .number({ invalid_type_error: "Enter a number of points." })
      .refine((v) => Number.isFinite(v), "Enter a number of points.")
      .refine((v) => v !== 0, "An adjustment of zero does nothing.")
      .refine(
        (v) => Math.abs(v) <= POINTS_ADJUSTMENT_MAX,
        `A single adjustment is capped at ${POINTS_ADJUSTMENT_MAX} points. Split a larger correction.`,
      )
      .refine(
        (v) => Number.isInteger(v),
        "Points are whole numbers — a fraction of a point cannot be shown to a buyer or spent.",
      ),
    /** Shown to the BUYER on their points page. */
    description: z
      .string()
      .trim()
      .min(1, "Say what the buyer will see for this entry.")
      .max(140, "Keep the buyer-facing line under 140 characters."),
    /** Never shown to the buyer. The next admin's answer to "why?". */
    adminReason: z
      .string()
      .trim()
      .min(
        POINTS_ADJUSTMENT_REASON_MIN,
        `Give a reason of at least ${POINTS_ADJUSTMENT_REASON_MIN} characters — the reader is the next admin, not the buyer.`,
      )
      .max(500, "Keep the reason under 500 characters."),
  })
  .strict();

export type PointsAdjustFormValues = z.infer<typeof pointsAdjustFormSchema>;
