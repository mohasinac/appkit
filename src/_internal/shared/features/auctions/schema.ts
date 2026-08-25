import { z } from "zod";

/**
 * Server-action input for placing a bid.
 *
 * Renamed from `placeBidSchema` 2026-08-24 (W3): a DIFFERENT `placeBidSchema`
 * exists at `features/auctions/schemas/bid-input.ts`, and the two are not
 * variants of one thing — that one is a client FORM factory taking the minimum
 * bid and returning `{ bidAmount }`, this one is the action payload
 * `{ auctionId, amount }`. Same name, different layer, different field names,
 * incompatible shapes. Two same-named exports in one package is a defect even
 * when both are correct, because the choice between them is invisible at the
 * call site (Root Cause #36, one union over).
 */
export const placeBidActionSchema = z.object({
  auctionId: z.string().min(1),
  amount: z.number().positive("Bid amount must be a positive number"),
});

export const cancelBidSchema = z.object({
  bidId: z.string().min(1),
  auctionId: z.string().min(1),
});

export const buyNowSchema = z.object({
  auctionId: z.string().min(1),
});

export type PlaceBidActionInput = z.infer<typeof placeBidActionSchema>;
export type CancelBidInput = z.infer<typeof cancelBidSchema>;
