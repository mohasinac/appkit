import { z } from "zod";

/**
 * Client-side schema for the place-bid form. Used by PlaceBidFormClient via
 * <Form> + FieldInput.
 *
 * `minBid` is the auction's live minimum acceptable next bid, resolved by
 * `resolveMinBid()` (`_internal/shared/features/auctions/config`) — the same
 * helper `placeBid` uses server-side, so this form can never seed or accept an
 * amount the server will then reject.
 *
 * `minBidLabel` is the currency-formatted rendering of `minBid` (e.g. "₹1,100")
 * — the schema takes it pre-formatted rather than importing a formatter so the
 * inline error reads in the buyer's currency instead of a bare number.
 *
 * Deliberately NOT enforced here: that the bid is an exact multiple of the
 * increment. `placeBid` only requires `amount >= currentBid + increment`, so
 * adding a multiple-of rule client-side would reject bids the server accepts.
 * A refinement claiming to do that used to exist but was a no-op — its
 * predicate was `(v - minBid) % inc === 0 || (v - minBid) >= 0`, and the
 * right-hand disjunct is always true once the `v >= minBid` check above has
 * passed, so it could never fail.
 */
export const placeBidSchema = (minBid: number, minBidLabel: string) =>
  z.object({
    bidAmount: z.coerce
      .number({ required_error: "Enter a bid amount" })
      .refine((v) => Number.isFinite(v) && v > 0, "Enter a valid bid amount")
      .refine((v) => v >= minBid, `Bid must be at least ${minBidLabel}`),
  });

export type PlaceBidValues = z.infer<ReturnType<typeof placeBidSchema>>;
