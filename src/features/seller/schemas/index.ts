export * from "./firestore";
import { z } from "zod";

// --- Sub-schemas --------------------------------------------------------------

export const storeStatusSchema = z.enum([
  "pending",
  "active",
  "suspended",
  "rejected",
]);

export const payoutStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const payoutPaymentMethodSchema = z.enum(["bank_transfer", "upi"]);

export const socialLinksSchema = z.object({
  twitter: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  linkedin: z.string().optional(),
});

// --- SellerStore schema -------------------------------------------------------

/**
 * Base Zod schema for a seller's store.
 * Apps can extend this to add their own fields:
 *
 * @example
 * import { sellerStoreSchema } from "@mohasinac/feat-seller";
 *
 * const mySellerSchema = sellerStoreSchema.extend({
 *   tier: z.enum(["standard", "premium"]).optional(),
 *   gstNumber: z.string().optional(),
 * });
 * type MySeller = z.infer<typeof mySellerSchema>;
 */
export const sellerStoreSchema = z.object({
  id: z.string(),
  storeSlug: z.string(),
  ownerId: z.string(),
  storeName: z.string(),
  storeDescription: z.string().optional(),
  storeCategory: z.string().optional(),
  storeLogoURL: z.string().optional(),
  storeBannerURL: z.string().optional(),
  status: storeStatusSchema,
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  socialLinks: socialLinksSchema.optional(),
  returnPolicy: z.string().optional(),
  shippingPolicy: z.string().optional(),
  isPublic: z.boolean(),
  isVacationMode: z.boolean().optional(),
  vacationMessage: z.string().optional(),
  stats: z
    .object({
      totalProducts: z.number(),
      itemsSold: z.number(),
      totalReviews: z.number(),
      averageRating: z.number().optional(),
    })
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// --- PayoutRecord schema ------------------------------------------------------

export const payoutRecordSchema = z.object({
  id: z.string(),
  sellerId: z.string(),
  sellerName: z.string(),
  sellerEmail: z.string(),
  amount: z.number(),
  grossAmount: z.number(),
  platformFee: z.number(),
  platformFeeRate: z.number(),
  currency: z.string(),
  status: payoutStatusSchema,
  paymentMethod: payoutPaymentMethodSchema,
  orderIds: z.array(z.string()),
  requestedAt: z.string(),
  processedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const sellerListParamsSchema = z.object({
  status: storeStatusSchema.optional(),
  category: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().optional(),
  perPage: z.coerce.number().optional(),
  sort: z.string().optional(),
});

export const payoutListParamsSchema = z.object({
  sellerId: z.string().optional(),
  status: payoutStatusSchema.optional(),
  page: z.coerce.number().optional(),
  perPage: z.coerce.number().optional(),
  sort: z.string().optional(),
});
