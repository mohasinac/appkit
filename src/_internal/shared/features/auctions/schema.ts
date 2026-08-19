import { z } from "zod";

export const placeBidSchema = z.object({
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

export type PlaceBidInput = z.infer<typeof placeBidSchema>;
export type CancelBidInput = z.infer<typeof cancelBidSchema>;
