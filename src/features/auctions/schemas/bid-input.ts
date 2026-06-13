import { z } from "zod";

/**
 * Client-side schema for the place-bid form. Used by PlaceBidFormClient via
 * <Form> + FieldInput. Schema-driven so all messages are localised by a single
 * Zod custom-message map.
 *
 * `minBid` and `minBidIncrement` are derived from the auction state and passed
 * to `placeBidSchema(minBid, minBidIncrement)` at render time.
 */
export const placeBidSchema = (minBid: number, minBidIncrement: number) =>
  z.object({
    bidAmount: z.coerce
      .number({ required_error: "Enter a bid amount" })
      .refine((v) => Number.isFinite(v) && v > 0, "Enter a valid bid amount")
      .refine((v) => v >= minBid, `Bid must be at least ${minBid}`)
      .refine(
        (v) => (v - minBid) % minBidIncrement === 0 || (v - minBid) >= 0,
        `Bid must respect the minimum increment of ${minBidIncrement}`,
      ),
  });

export type PlaceBidValues = z.infer<ReturnType<typeof placeBidSchema>>;
