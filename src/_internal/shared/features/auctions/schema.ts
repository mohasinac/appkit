import { z } from "zod";

export const placeBidSchema = z.object({
  auctionId: z.string().min(1),
  amount: z.number().int().positive("Bid amount must be a positive integer (paise)"),
});

export const cancelBidSchema = z.object({
  bidId: z.string().min(1),
  auctionId: z.string().min(1),
});

export const buyNowSchema = z.object({
  auctionId: z.string().min(1),
});

export type PlaceBidInput = z.infer<typeof placeBidSchema>;
export type CancelBidInput = z.infer<typeof cancelBidSchema>;
