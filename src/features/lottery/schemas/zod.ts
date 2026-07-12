/**
 * Zod schemas for lottery entry submission and validation.
 */
import { z } from "zod";

export const lotteryEntrySubmitSchema = z.object({
  transactionId: z.string().min(4, "Transaction ID must be at least 4 characters"),
  paymentTime: z.string().datetime({ message: "Payment time must be a valid ISO datetime" }),
  purchasedItemNumber: z.number().int().min(1, "Item number must be at least 1"),
  userPhone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^\+?[\d\s\-()]{10,}$/, "Enter a valid phone number"),
});

export type LotteryEntrySubmitInput = z.infer<typeof lotteryEntrySubmitSchema>;

/** Schema for flag action */
export const flagLotteryEntrySchema = z.object({
  entryId: z.string().min(1),
  flagNote: z.string().min(1, "Flag note is required"),
  flaggedByUserId: z.string().min(1),
});

export type FlagLotteryEntryInput = z.infer<typeof flagLotteryEntrySchema>;

/** Schema for reopen-slot action */
export const reopenLotterySlotSchema = z.object({
  sourceType: z.enum(["event", "product"]),
  sourceId: z.string().min(1),
  slotNumber: z.number().int().min(1),
  adminUserId: z.string().min(1),
});

export type ReopenLotterySlotInput = z.infer<typeof reopenLotterySlotSchema>;

/** Schema for submit lottery pull (full, server-side) */
export const submitLotteryPullSchema = z
  .object({
    sourceType: z.enum(["event", "product"]),
    eventId: z.string().optional(),
    productId: z.string().optional(),
    userId: z.string().min(1),
    userDisplayName: z.string().optional(),
    userEmail: z.string().email().optional(),
  })
  .merge(lotteryEntrySubmitSchema)
  .refine(
    (data) =>
      (data.sourceType === "event" && !!data.eventId) ||
      (data.sourceType === "product" && !!data.productId),
    { message: "eventId or productId must be provided matching sourceType" },
  );

export type SubmitLotteryPullInput = z.infer<typeof submitLotteryPullSchema>;
