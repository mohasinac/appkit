import { z } from "zod";

const priceSchema = z.number().int().min(0, "Price must be non-negative (paise)");

const conditionSchema = z.enum(["new", "like_new", "good", "fair", "poor", "used", "refurbished", "broken"]);

export const productInputSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(10000).optional(),
  category: z.string().min(1, "Category is required"),
  brandSlug: z.string().optional(),
  price: priceSchema,
  currency: z.string().default("INR"),
  stockQuantity: z.number().int().min(0).default(0),
  availableQuantity: z.number().int().min(0).default(0),
  mainImage: z.string().url("mainImage must be a valid URL"),
  images: z.array(z.string().url()).max(20).default([]),
  condition: conditionSchema.optional(),
  tags: z.array(z.string()).max(20).default([]),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  seoKeywords: z.array(z.string()).max(10).optional(),
  shippingInfo: z.string().max(1000).optional(),
  returnPolicy: z.string().max(1000).optional(),
  shippingPaidBy: z.enum(["seller", "buyer"]).optional(),
  insurance: z.boolean().optional(),
  insuranceCost: z.number().int().min(0).optional(),
  allowOffers: z.boolean().optional(),
  minOfferPercent: z.number().min(0).max(100).optional(),
  features: z.array(z.string()).max(50).optional(),
});

export const productUpdateSchema = productInputSchema.partial();

export const auctionInputSchema = productInputSchema.extend({
  // SB1-G — canonical discriminator. Locked to "auction" via literal.
  listingType: z.literal("auction"),
  startingBid: priceSchema,
  reservePrice: priceSchema.optional(),
  buyNowPrice: priceSchema.optional(),
  minBidIncrement: z.number().int().min(1).optional(),
  auctionEndDate: z.string().datetime({ offset: true }),
  autoExtendable: z.boolean().default(false),
  auctionExtensionMinutes: z.number().int().min(1).max(30).optional(),
  auctionShippingPaidBy: z.enum(["seller", "winner"]).optional(),
});

export const preOrderInputSchema = productInputSchema.extend({
  // SB1-G — canonical discriminator. Locked to "pre-order" via literal.
  listingType: z.literal("pre-order"),
  preOrderDeliveryDate: z.string().datetime({ offset: true }),
  preOrderDepositPercent: z.number().min(0).max(100).optional(),
  preOrderMaxQuantity: z.number().int().min(1).optional(),
  preOrderProductionStatus: z.enum(["upcoming", "in_production", "ready_to_ship"]).default("upcoming"),
  preOrderCancellable: z.boolean().default(true),
});

export const setFeaturedSchema = z.object({
  productId: z.string().min(1),
  featured: z.boolean(),
});

export const setStatusSchema = z.object({
  productId: z.string().min(1),
  status: z.enum(["draft", "published", "archived"]),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
export type AuctionInput = z.infer<typeof auctionInputSchema>;
export type PreOrderInput = z.infer<typeof preOrderInputSchema>;
