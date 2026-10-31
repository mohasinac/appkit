import { z } from "zod";
import { mediaUrlSchema } from "../../../../validation/schemas";
import { PRODUCT_MAX_IMAGES } from "../../media/limits";
import { PRODUCT_UPDATABLE_FIELDS } from "../../../../features/products/schemas/firestore";
import {
  checkPreOrderDeliveryDate,
  preOrderDeliveryMessage,
  type PreOrderDeliveryDateLike,
} from "../../../../features/products/constants/preorder-window";

const priceSchema = z.number().min(0, "Price must be non-negative");

const conditionSchema = z.enum(["new", "like_new", "good", "fair", "poor", "used", "refurbished", "broken"]);

const productBaseShape = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(10000).optional(),
  category: z.string().min(1, "Category is required"),
  brandSlug: z.string().optional(),
  price: priceSchema,
  currency: z.string().default("INR"),
  stockQuantity: z.number().int().min(0).default(0),
  availableQuantity: z.number().int().min(0).default(0),
  mainImage: mediaUrlSchema,
  images: z.array(mediaUrlSchema).max(PRODUCT_MAX_IMAGES).default([]),
  condition: conditionSchema.optional(),
  tags: z.array(z.string()).max(20).default([]),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  seoKeywords: z.array(z.string()).max(10).optional(),
  shippingInfo: z.string().max(1000).optional(),
  returnPolicy: z.string().max(1000).optional(),
  // Absent means final sale. No `.default()` — see request-schemas.ts.
  finalSale: z.boolean().optional(),
  shippingPaidBy: z.enum(["seller", "buyer"]).optional(),
  insurance: z.boolean().optional(),
  insuranceCost: z.number().min(0).optional(),
  allowOffers: z.boolean().optional(),
  minOfferPercent: z.number().min(0).max(100).optional(),
  features: z.array(z.string()).max(50).optional(),
});

/**
 * Every other field a seller legitimately owns on their own listing.
 *
 * 🛑 Declared, never `.passthrough()`. `sellerUpdateProduct` hands its parsed
 * input straight to `productRepository.updateProduct` with no field filter, so
 * passthrough would let a seller forge `currentBid` / `bidCount` / `viewCount`
 * or reassign `storeId` to another store. The three sibling product-update
 * routes DO use `.passthrough()`; they get away with it because they are
 * admin-gated. This one is not.
 *
 * Derived from `PRODUCT_UPDATABLE_FIELDS` — the codebase's existing declaration
 * of what a seller may change — so the two cannot drift (Root Cause #61).
 *
 * Why this exists: `productInputSchema` declared 24 fields while that constant
 * lists 55, and `z.object()` SILENTLY STRIPS whatever it does not declare. The
 * parse SUCCEEDED, so nothing surfaced anywhere — the seller saw a success
 * toast and 38 fields were discarded on the way to Firestore, including
 * `status` (so Publish wrote nothing at all), `listingType`, and all four
 * per-type blocks that `draftToProductInput` had just carefully assembled.
 * Update-side sibling of Root Cause #101.
 */
const EXTRA_WRITABLE_FIELDS = [
  ...PRODUCT_UPDATABLE_FIELDS,
  // Absent from that constant, but plainly the seller's own listing data —
  // their media, their tax codes. Omitting them is an oversight in the list,
  // not a policy: there is no integrity risk in a seller setting either.
  "video",
  "gstRate",
  "hsnCode",
  // Collector Drop terms. Writable while the listing is still a draft; once a real
  // bid exists, `sellerUpdateProduct` refuses them — changing the starting bid
  // or the end date under a live bidder is the one case that must not pass.
  "startingBid",
  "collectorDropEndDate",
] as const;

const declaredKeys = new Set(Object.keys(productBaseShape.shape));

const extraWritableShape = Object.fromEntries(
  EXTRA_WRITABLE_FIELDS.filter((field) => !declaredKeys.has(field)).map(
    (field) => [field, z.unknown().optional()],
  ),
) as Record<string, z.ZodOptional<z.ZodUnknown>>;

export const productInputSchema = productBaseShape.extend(extraWritableShape);

/**
 * The 45-day pre-order delivery cap, as a field-level refinement.
 *
 * 🛑 FIELD level, not a whole-object `.refine()`. An object refinement carries
 * no `path` unless one is supplied by hand, and a message with no path lands
 * nowhere — `applyZodIssues` keys on the dotted path and `<FormErrorSummary>`
 * offers a jump link from it, so an un-pathed issue is a save that fails with
 * the field looking fine. Refining the field is what puts the message on the
 * date input.
 *
 * Accepts `string | Date` because the two write paths disagree about the
 * shape: a request body carries ISO text while `productToDraft`/an admin tool
 * can hand back a real `Date`. The verdict function takes both, so neither
 * caller needs a cast.
 */
const preOrderDeliveryDateRefinement = z
  .union([z.string(), z.date()])
  .superRefine((value, ctx) => {
    const verdict = checkPreOrderDeliveryDate(value as PreOrderDeliveryDateLike);
    if (verdict === "ok" || verdict === "absent") return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: preOrderDeliveryMessage(verdict) ?? "Invalid delivery date",
    });
  });

/**
 * 🛑 The UPDATE path needs the cap as badly as create does, and did not have it.
 *
 * `preOrderDeliveryDate` reaches this schema through `EXTRA_WRITABLE_FIELDS`,
 * i.e. as `z.unknown().optional()` — so before this a seller could create a
 * compliant 30-day pre-order and immediately PATCH it to 200 days through
 * `updateProductAction`, and every bound on the create side was decoration.
 * This is the create/update asymmetry of Root Cause #39: a rule applied to one
 * door and not the other is not a rule.
 *
 * `.extend()` AFTER `.partial()`, so the field stays optional (a partial update
 * that does not mention the date must not be refused for not mentioning it)
 * while a supplied value is bounded.
 */
export const productUpdateSchema = productInputSchema.partial().extend({
  preOrderDeliveryDate: preOrderDeliveryDateRefinement.optional(),
});

export const collectorDropInputSchema = productInputSchema.extend({
  // SB1-G — canonical discriminator. Locked to "collector-drop" via literal.
  listingType: z.literal("collector-drop"),
  startingBid: priceSchema,
  reservePrice: priceSchema.optional(),
  buyNowPrice: priceSchema.optional(),
  minBidIncrement: z.number().min(1).optional(),
  collectorDropEndDate: z.string().datetime({ offset: true }),
  autoExtendable: z.boolean().default(false),
  collectorDropExtensionMinutes: z.number().int().min(1).max(30).optional(),
  collectorDropShippingPaidBy: z.enum(["seller", "winner"]).optional(),
});

export const preOrderInputSchema = productInputSchema.extend({
  // SB1-G — canonical discriminator. Locked to "pre-order" via literal.
  listingType: z.literal("pre-order"),
  /*
   * 🛑 The ONE bound-check that covers the real create path
   * (`createPreOrderAction`). It validated datetime FORMAT only until Phase 2,
   * so a pre-order promising delivery in 200 days parsed cleanly — and Cashfree
   * Easy Split cannot hold a settlement past 45 days, so that order's money had
   * nowhere lawful to go. See `PREORDER_MAX_DELIVERY_DAYS`.
   *
   * The format check stays in front of the window check: `.datetime()` is what
   * refuses `"tomorrow"` with a message about the format rather than about the
   * window.
   */
  preOrderDeliveryDate: z
    .string()
    .datetime({ offset: true })
    .superRefine((value, ctx) => {
      const verdict = checkPreOrderDeliveryDate(value);
      if (verdict === "ok") return;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: preOrderDeliveryMessage(verdict) ?? "Invalid delivery date",
      });
    }),
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
export type CollectorDropInput = z.infer<typeof collectorDropInputSchema>;
export type PreOrderInput = z.infer<typeof preOrderInputSchema>;
