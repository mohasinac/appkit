export * from "./firestore";
import { z } from "zod";
import { mediaFieldSchema } from "../../media/types/index";

// --- Sub-schemas --------------------------------------------------------------

export const productImageSchema = z.object({
  url: z.string(),
  thumbnailUrl: z.string().optional(),
  alt: z.string().optional(),
  order: z.number().optional(),
});

export const productSeoSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});

// --- Base item schema ---------------------------------------------------------

/**
 * Base Zod schema for a product item.
 * Apps can extend this to add their own fields:
 *
 * @example
 * import { productItemSchema } from "@mohasinac/feat-products";
 *
 * const myProductSchema = productItemSchema.extend({
 *   brand: z.string(),
 *   auctionEndDate: z.string().optional(),
 * });
 * type MyProduct = z.infer<typeof myProductSchema>;
 */
export const productItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string().optional(),
  description: z.string().optional(),
  price: z.number(),
  originalPrice: z.number().optional(),
  currency: z.string().optional(),
  mainImage: z.string().optional(),
  images: z.array(z.string()).optional(),
  media: z.array(mediaFieldSchema).optional(),
  video: z
    .object({ url: z.string(), thumbnailUrl: z.string().optional() })
    .optional(),
  featured: z.boolean().optional(),
  isPromoted: z.boolean().optional(),
  currentBid: z.number().optional(),
  availableQuantity: z.number().optional(),
  category: z.string().optional(),
  categorySlug: z.string().optional(),
  sellerId: z.string().optional(),
  sellerName: z.string().optional(),
  sellerAvatar: z.string().optional(),
  status: z.enum([
    "draft",
    "published",
    "archived",
    "sold",
    "out_of_stock",
    "discontinued",
  ]),
  condition: z
    .enum([
      "new",
      "like_new",
      "good",
      "fair",
      "poor",
      "used",
      "refurbished",
      "broken",
    ])
    .optional(),
  listingType: z.enum(["fixed", "standard", "auction", "pre-order"]).optional(),
  isAuction: z.boolean().optional(),
  isPreOrder: z.boolean().optional(),
  inStock: z.boolean().optional(),
  stockCount: z.number().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  tags: z.array(z.string()).optional(),
  attributes: z.record(z.string()).optional(),
  seo: productSeoSchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().optional(),

  // Detail fields
  stockQuantity: z.number().optional(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  storeId: z.string().optional(),
  sellerEmail: z.string().optional(),
  specifications: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
        unit: z.string().optional(),
      }),
    )
    .optional(),
  features: z.array(z.string()).optional(),
  shippingInfo: z.string().optional(),
  returnPolicy: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  howToUse: z.array(z.string()).optional(),
  allowOffers: z.boolean().optional(),
  minOfferPercent: z.number().optional(),
  bulkDiscounts: z
    .array(z.object({ quantity: z.number(), discountPercent: z.number() }))
    .optional(),

  // Auction detail fields
  startingBid: z.number().optional(),
  bidCount: z.number().optional(),
  auctionEndDate: z.union([z.string(), z.date()]).optional(),
  reservePrice: z.number().optional(),
  buyNowPrice: z.number().optional(),
  minBidIncrement: z.number().optional(),
  autoExtendable: z.boolean().optional(),
  auctionExtensionMinutes: z.number().optional(),
  auctionShippingPaidBy: z.enum(["seller", "winner"]).optional(),

  // Pre-order detail fields
  preOrderDeliveryDate: z.union([z.string(), z.date()]).optional(),
  preOrderDepositPercent: z.number().optional(),
  preOrderDepositAmount: z.number().optional(),
  preOrderMaxQuantity: z.number().optional(),
  preOrderCurrentCount: z.number().optional(),
  preOrderProductionStatus: z
    .enum(["upcoming", "in_production", "ready_to_ship"])
    .optional(),
  preOrderCancellable: z.boolean().optional(),

  // Analytics
  viewCount: z.number().optional(),
  avgRating: z.number().optional(),

  // Shipping
  shippingPaidBy: z.enum(["seller", "buyer"]).optional(),
  pickupAddressId: z.string().optional(),
  insurance: z.boolean().optional(),
  insuranceCost: z.number().optional(),
});

/** Base Zod schema for list-query parameters. */
export const productListParamsSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  status: z
    .enum([
      "draft",
      "published",
      "archived",
      "sold",
      "out_of_stock",
      "discontinued",
    ])
    .optional(),
  condition: z
    .enum([
      "new",
      "like_new",
      "good",
      "fair",
      "poor",
      "used",
      "refurbished",
      "broken",
    ])
    .optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  inStock: z.coerce.boolean().optional(),
  isAuction: z.coerce.boolean().optional(),
  sellerId: z.string().optional(),
  sort: z.string().optional(),
  page: z.coerce.number().optional(),
  perPage: z.coerce.number().optional(),
  featured: z.coerce.boolean().optional(),
});
