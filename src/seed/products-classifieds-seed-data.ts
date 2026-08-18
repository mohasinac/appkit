/*
 * WHY: Real (non-tester-sandbox) classified listing so testers and shoppers can exercise
 *      the classified contact-seller flow (no checkout, chat/phone only) against permanent
 *      catalog content. Previously an empty stub — "out of scope for the minimal
 *      Beyblade-focused demo catalog" — now populated with one seller-run local listing.
 * WHAT: Exports 1 classified listing on Beyblade Arena — local meetup, negotiable.
 *
 * EXPORTS:
 *   productsClassifiedsSeedData — Array of 1 Partial<ProductDocument> with listingType:"classified"
 *
 * @tag domain:products,classifieds
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

export const productsClassifiedsSeedData: Partial<ProductDocument>[] = [
  {
    id: "classified-beyblade-stadium-set",
    slug: "classified-beyblade-stadium-set",
    title: "Used Beyblade Stadium Set — Local Pickup Only",
    description: "Well-loved Beyblade stadium with 6 tops and 2 launchers, sold as-is. Meet up locally or arrange your own shipping — price is negotiable.",
    categorySlugs: ["category-spinning-tops"],
    categoryNames: ["Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 1200,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-stadium-set-1-20260101/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-stadium-set-1-20260101/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    listingType: "classified" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    classified: {
      meetupArea: { city: "Mumbai", locality: "Andheri West", pincode: "400058" },
      contactMethod: "both" as const,
      acceptsShipping: false,
      negotiable: true,
    },
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["classified", "local-pickup"],
    createdAt: new Date("2026-05-05"),
    updatedAt: new Date("2026-05-05"),
    searchTokens: buildSearchTokens(
      "Used Beyblade Stadium Set — Local Pickup Only",
      "Well-loved Beyblade stadium with 6 tops and 2 launchers.",
      "Beyblade",
      "brand-beyblade",
      ["Spinning Tops"],
      ["classified", "local-pickup"],
    ),
  } as unknown as Partial<ProductDocument>,
];
