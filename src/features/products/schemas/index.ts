export * from "./firestore";
import { z } from "zod";
import { mediaFieldSchema } from "../../media/types/index";
import { ALL_LISTING_TYPES } from "../../../_internal/shared/listing-types/feature-flags";
import type { ListingType } from "../types/index";
import {
  PRIZE_DRAW_DURATION_DAYS_MIN,
  PRIZE_DRAW_DURATION_DAYS_MAX,
} from "../../../_internal/shared/checkout/rules/_limits";

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

/** Print-specific metadata for "art" / "stickers" listings. */
export const printMetaSchema = z.object({
  size: z.string().max(80).optional(),
  material: z.string().max(80).optional(),
  finish: z.string().max(80).optional(),
  editionSize: z.number().int().positive().optional(),
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
/**
 * The `ListingType` union as a Zod enum, DERIVED.
 *
 * 🛑 Two hand-written copies of this lived in this file and BOTH had drifted to
 * seven of nine — `art` and `stickers` were missing from the item schema and
 * from the query schema. Consequence: `productItemSchema.parse()` stripped
 * `listingType` off every art and sticker row (the field is `.optional()`, so a
 * value outside the enum is a parse FAILURE, and a caller using `safeParse` or
 * `.partial()` loses it silently), and `?listingType=art` on any route
 * validating against the query schema was rejected as an invalid value.
 *
 * `z.enum` needs a non-empty literal tuple, hence the cast — `ALL_LISTING_TYPES`
 * is derived from `Record<ListingType, true>`, so its CONTENTS are
 * compile-checked against the union even though its length is not.
 *
 * Registered in `audit-listing-type-tab-coverage`'s STAYS_DERIVED so nobody
 * re-expands it into a literal for readability.
 */
const LISTING_TYPE_ENUM = z.enum(
  ALL_LISTING_TYPES as [ListingType, ...ListingType[]],
);

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
  allowShipBeforeEmiComplete: z.boolean().optional(),
  printMeta: printMetaSchema.optional(),
  currentBid: z.number().optional(),
  availableQuantity: z.number().optional(),
  category: z.string().optional(),
  categorySlug: z.string().optional(),
  sellerAvatar: z.string().optional(),
  status: z.enum([
    "draft",
    "published",
    "in_review",
    "archived",
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
      "graded",
    ])
    .optional(),
  // SB1-G Phase 4 — canonical discriminator (legacy `isAuction`/`isPreOrder` booleans removed).
  madeToOrder: z.boolean().optional(),
  listingType: LISTING_TYPE_ENUM.optional(),
  // SB1-C — prize-draw + bundle fields. All optional.
  maxPerUser: z.number().int().positive().optional(),
  partOfBundleIds: z.array(z.string()).optional(),
  partOfBundleTitles: z.array(z.string()).optional(),
  prizeDrawItems: z
    .array(
      z.object({
        itemNumber: z.number().int().positive(),
        title: z.string().min(1),
        description: z.string().optional(),
        images: z.array(z.string()).min(1).max(2),
        video: z
          .object({ url: z.string(), thumbnailUrl: z.string().optional() })
          .optional(),
        condition: z.string(),
        estimatedValue: z.number().optional(),
        isWon: z.boolean(),
        wonByOrderId: z.string().optional(),
      }),
    )
    .min(2)
    .max(16)
    .optional(),
  pricePerEntry: z.number().positive().optional(),
  prizeMaxEntries: z.number().int().positive().optional(),
  prizeCurrentEntries: z.number().int().nonnegative().optional(),
  prizeRevealWindowStart: z.union([z.string(), z.date()]).optional(),
  prizeRevealWindowEnd: z.union([z.string(), z.date()]).optional(),
  prizeRevealStatus: z.enum(["pending", "open", "closed"]).optional(),
  prizeDrawDurationDays: z
    .number()
    .int()
    .min(PRIZE_DRAW_DURATION_DAYS_MIN)
    .max(PRIZE_DRAW_DURATION_DAYS_MAX)
    .optional(),
  prizeRevealMode: z.enum(["instant", "scheduled"]).optional(),
  prizeGithubFileUrl: z.string().url().optional(),
  inStock: z.boolean().optional(),
  stockCount: z.number().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  tags: z.array(z.string()).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  seo: productSeoSchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().optional(),

  // Detail fields
  stockQuantity: z.number().optional(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  storeId: z.string().optional(),
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

  // Custom fields & sections
  customFields: z
    .array(
      z.object({
        key: z.string(),
        type: z.enum(["text", "number", "boolean", "url"]),
        value: z.string(),
        unit: z.string().optional(),
      }),
    )
    .optional(),
  customSections: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        text: z.string().optional(),
        fields: z
          .array(
            z.object({
              key: z.string(),
              type: z.enum(["text", "number", "boolean", "url"]),
              value: z.string(),
              unit: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

/** Base Zod schema for list-query parameters. */
export const productListParamsSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  status: z
    .enum([
      "draft",
      "published",
      "in_review",
      "archived",
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
      "graded",
    ])
    .optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  inStock: z.coerce.boolean().optional(),
  listingType: LISTING_TYPE_ENUM.optional(),
  storeId: z.string().optional(),
  sort: z.string().optional(),
  page: z.coerce.number().optional(),
  perPage: z.coerce.number().optional(),
  featured: z.coerce.boolean().optional(),
});
