import { z } from "zod";
import { PRODUCT_MAX_IMAGES } from "../../../_internal/shared/media/limits";

/**
 * The seller listing form's DRAFT schema — the flat, form-shaped view of a
 * product, registered as `SCHEMAS.forms.product`.
 *
 * ## Why this exists as a separate file
 *
 * It is registered so `roundtrip-diff` can check it. That tool reads
 * `SCHEMAS.forms`, parses real documents through each registered schema, and
 * reports every key the schema would DELETE — and its own header names
 * `productBaseSchema` eating the `classified*` / `liveItem*` fields as the
 * reason it was written.
 *
 * `product` was never registered. So the one tool built to catch exactly this
 * bug could not see the entity the bug was about, and the registry's own
 * docstring said why: *"an entity absent from it has no such protection,
 * which is the whole reason to register early."*
 *
 * ## Draft-shaped, deliberately
 *
 * This models what the user TYPES — flat `classifiedCity`, `liveSpecies`,
 * `printSize` — not what is stored. `draftToProductInput` translates between
 * the two. `roundtrip-diff` lists `product` in its `DRAFT_SHAPED` set for the
 * same reason `blog` and `event` are there: real documents legitimately fail
 * to parse against a draft, and only the DROPPED-KEY half of the check is
 * meaningful. That half is the half that matters.
 *
 * Kept permissive (`.passthrough()`, almost everything optional): a draft is
 * saved continuously while half-filled, so this must accept an in-progress
 * listing. The strict rules live in `productCreateSchema` at the write
 * boundary, which is where refusing a bad listing is useful.
 */
export const productDraftSchema = z
  .object({
    title: z.string().max(200).optional(),
    slug: z.string().optional(),
    description: z.string().max(10000).optional(),
    category: z.string().optional(),
    brand: z.string().optional(),
    condition: z.string().optional(),
    tags: z.array(z.string()).optional(),

    // Media
    mainImage: z.string().optional(),
    images: z.array(z.string()).max(PRODUCT_MAX_IMAGES).optional(),
    /*
     * Spelled out rather than `z.record(z.unknown())`: a draft's video can
     * come from an upload, a YouTube id or an external URL, and each source
     * fills a different subset. Naming the fields is what lets this schema
     * report a video the form would fail to carry.
     */
    video: z
      .object({
        url: z.string(),
        type: z.literal("video").optional(),
        thumbnailUrl: z.string().optional(),
        source: z.enum(["upload", "youtube", "external"]).optional(),
        youtubeId: z.string().optional(),
        duration: z.number().optional(),
      })
      .passthrough()
      .optional(),
    youtubeId: z.string().optional(),
    externalVideoUrl: z.string().optional(),

    // Pricing
    price: z.number().optional(),
    compareAtPrice: z.number().optional(),
    stockQuantity: z.number().optional(),
    featured: z.boolean().optional(),
    isPromoted: z.boolean().optional(),
    isNew: z.boolean().optional(),
    isOnSale: z.boolean().optional(),
    allowOffers: z.boolean().optional(),
    minOfferPercent: z.number().optional(),

    // Shipping
    shippingPaidBy: z.enum(["buyer", "seller"]).optional(),
    pickupAddressId: z.string().optional(),
    insurance: z.boolean().optional(),
    insuranceCost: z.number().optional(),
    gstRate: z.union([z.literal(0), z.literal(5), z.literal(12), z.literal(18), z.literal(28)]).optional(),
    hsnCode: z.string().optional(),

    // Returns
    finalSale: z.boolean().optional(),
    returnPolicy: z.string().max(1000).optional(),

    // Publish
    status: z.enum(["draft", "published"]).optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    barcodeId: z.string().optional(),

    // Auction
    startingBid: z.number().optional(),
    reservePrice: z.number().optional(),
    buyNowPrice: z.number().optional(),
    minBidIncrement: z.number().optional(),
    auctionEndDate: z.string().optional(),
    auctionShippingPaidBy: z.enum(["winner", "seller"]).optional(),
    autoExtendable: z.boolean().optional(),
    auctionExtensionMinutes: z.number().optional(),

    // Pre-order
    preOrderDeliveryDate: z.string().optional(),
    preOrderDepositPercent: z.number().optional(),
    preOrderMaxQuantity: z.number().optional(),
    preOrderProductionStatus: z.enum(["upcoming", "in_production", "ready_to_ship"]).optional(),
    preOrderCancellable: z.boolean().optional(),

    // Classified — FLAT here, nested on the document.
    classifiedCity: z.string().optional(),
    classifiedLocality: z.string().optional(),
    classifiedPincode: z.string().optional(),
    classifiedContactMethod: z.enum(["chat", "phone", "both"]).optional(),
    classifiedAcceptsShipping: z.boolean().optional(),
    classifiedNegotiable: z.boolean().optional(),

    // Digital code — FLAT here, nested on the document.
    digitalCodeDelivery: z.enum(["auto-claim", "manual-email"]).optional(),
    digitalCodePoolSize: z.number().optional(),
    digitalCodeRedemptionInstructions: z.string().optional(),
    digitalCodeExpiresAt: z.string().optional(),

    // Live item — FLAT here, nested on the document.
    liveSpecies: z.string().optional(),
    liveAgeMonths: z.number().optional(),
    liveSex: z.enum(["male", "female", "unknown", "n/a"]).optional(),
    liveCareInfo: z.string().optional(),
    liveTransportMethod: z.enum(["courier", "in-person", "specialist"]).optional(),
    liveHandlingFee: z.number().optional(),
    liveJurisdictions: z.array(z.string()).optional(),
    liveCites: z.boolean().optional(),

    // Print meta (art + stickers) — FLAT here, nested on the document.
    printSize: z.string().optional(),
    printMaterial: z.string().optional(),
    printFinish: z.string().optional(),
    printEditionSize: z.number().optional(),
  })
  .passthrough();

export type ProductDraftInput = z.infer<typeof productDraftSchema>;
