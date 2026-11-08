/**
 * Zod schemas for giveaway entry submission and validation.
 */
import { z } from "zod";

export const giveawayEntrySubmitSchema = z.object({
  transactionId: z.string().min(4, "Transaction ID must be at least 4 characters"),
  paymentTime: z.string().datetime({ message: "Payment time must be a valid ISO datetime" }),
  purchasedItemNumber: z.number().int().min(1, "Item number must be at least 1"),
  userPhone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^\+?[\d\s\-()]{10,}$/, "Enter a valid phone number"),
});

export type GiveawayEntrySubmitInput = z.infer<typeof giveawayEntrySubmitSchema>;

/** Schema for flag action */
export const flagGiveawayEntrySchema = z.object({
  entryId: z.string().min(1),
  flagNote: z.string().min(1, "Flag note is required"),
  flaggedByUserId: z.string().min(1),
});

export type FlagGiveawayEntryInput = z.infer<typeof flagGiveawayEntrySchema>;

/** Schema for reopen-slot action */
export const reopenGiveawaySlotSchema = z.object({
  sourceType: z.enum(["event", "product"]),
  sourceId: z.string().min(1),
  slotNumber: z.number().int().min(1),
  adminUserId: z.string().min(1),
});

export type ReopenGiveawaySlotInput = z.infer<typeof reopenGiveawaySlotSchema>;

/** Schema for submit giveaway pull (full, server-side) */
export const submitGiveawayPullSchema = z
  .object({
    sourceType: z.enum(["event", "product"]),
    eventId: z.string().optional(),
    productId: z.string().optional(),
    userId: z.string().min(1),
    userDisplayName: z.string().optional(),
    userEmail: z.string().email().optional(),
  })
  .merge(giveawayEntrySubmitSchema)
  .refine(
    (data) =>
      (data.sourceType === "event" && !!data.eventId) ||
      (data.sourceType === "product" && !!data.productId),
    { message: "eventId or productId must be provided matching sourceType" },
  );

export type SubmitGiveawayPullInput = z.infer<typeof submitGiveawayPullSchema>;
