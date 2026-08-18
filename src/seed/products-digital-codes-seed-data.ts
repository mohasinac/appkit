/*
 * WHY: Real (non-tester-sandbox) digital-code listing so testers and shoppers can exercise
 *      the auto-claim digital delivery flow against permanent catalog content. Previously an
 *      empty stub — "out of scope for the minimal Beyblade-focused demo catalog" — now
 *      populated with one companion-app unlock code, on-theme for the spinning-tops catalog.
 * WHAT: Exports 1 digital-code listing on Beyblade Arena — auto-claim delivery.
 *
 * EXPORTS:
 *   productsDigitalCodesSeedData — Array of 1 Partial<ProductDocument> with listingType:"digital-code"
 *
 * @tag domain:products,digital-codes
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import { ProductDocument } from "../features/products/schemas/firestore";
import { PRODUCT_FIELDS } from "../constants/field-names";
import { buildSearchTokens } from "../utils/search-tokens";
import { seedExtMedia } from "./_helpers/media";

export const productsDigitalCodesSeedData: Partial<ProductDocument>[] = [
  {
    id: "digitalcode-beyblade-x-app-unlock",
    slug: "digitalcode-beyblade-x-app-unlock",
    title: "Beyblade X Companion App — Premium Unlock Code",
    description: "Digital unlock code for the Beyblade X companion app's premium tournament tracker and battle-log features. Delivered instantly after payment.",
    categorySlugs: ["category-spinning-tops"],
    categoryNames: ["Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    price: 199,
    currency: "INR",
    stockQuantity: 25,
    availableQuantity: 25,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/digitalcode-image-beyblade-x-app-unlock-1-20260101/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/digitalcode-image-beyblade-x-app-unlock-1-20260101/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    listingType: "digital-code" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    digitalCode: {
      codeDeliveryMethod: "auto-claim" as const,
      codePoolSize: 25,
      codesAvailable: 25,
      redemptionInstructions: "Open the Beyblade X companion app, go to Settings → Redeem Code, and enter your code to unlock premium features.",
    },
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["digital-code", "app-unlock"],
    createdAt: new Date("2026-05-05"),
    updatedAt: new Date("2026-05-05"),
    searchTokens: buildSearchTokens(
      "Beyblade X Companion App — Premium Unlock Code",
      "Digital unlock code for the Beyblade X companion app.",
      "Takara-Tomy",
      "brand-takara-tomy",
      ["Spinning Tops"],
      ["digital-code", "app-unlock"],
    ),
  } as unknown as Partial<ProductDocument>,
];
