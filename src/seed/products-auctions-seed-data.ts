/*
 * WHY: Seeds a minimal set of Beyblade auction listings for the demo catalog.
 * WHAT: Exports 2 auction products with listingType:"auction", one vintage Original-series
 *       piece and one rare Metal Fight piece — both from the Beyblade Arena store.
 *
 * EXPORTS:
 *   productsAuctionsSeedData — Array of 2 auction products with listingType:"auction"
 *
 * @tag domain:auctions,products
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

function withTokens(p: Partial<ProductDocument>): Partial<ProductDocument> {
  return {
    tags: [],
    featured: false,
    price: p.startingBid ?? 0,
    stockQuantity: 1,
    availableQuantity: p.isSold ? 0 : 1,
    ...p,
    searchTokens: buildSearchTokens(
      p.title, p.description, p.brand, p.brandSlug,
      p.categoryNames, p.tags, p.features, p.condition,
      p.specifications?.map((s) => `${s.name} ${s.value}`),
    ),
  };
}

const _rawProductsAuctionsSeedData: Partial<ProductDocument>[] = [
  {
    id: "auction-beyblade-original-dragoon-storm",
    slug: "auction-beyblade-original-dragoon-storm",
    title: "Beyblade Original — Dragoon Storm (Rare Sealed)",
    description: "Sealed, unopened Dragoon Storm from the original 1999-2003 series. A grail piece for original-generation collectors.",
    categorySlugs: ["category-beyblade-original", "category-spinning-tops"],
    categoryNames: ["Beyblade Original", "Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    startingBid: 299900, // ₹2,999
    buyItNowPriceInPaise: 599900, // ₹5,999
    currentBid: 349900,
    currency: "INR",
    auctionEndDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    bidCount: 3,
    bidsHaveStarted: true,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-original-dragoon-storm-1-20260101/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-original-dragoon-storm-1-20260101/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-05-18"),
    updatedAt: new Date("2026-05-21"),
  },
  {
    id: "auction-beyblade-metal-lightning-l-drago",
    slug: "auction-beyblade-metal-lightning-l-drago",
    title: "Metal Fight Beyblade BB-99 Lightning L-Drago",
    description: "Lightning L-Drago 100HF/S, a highly sought-after Metal Fury era top in excellent condition.",
    categorySlugs: ["category-beyblade-metal", "category-spinning-tops"],
    categoryNames: ["Beyblade Metal Fight", "Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    startingBid: 199900, // ₹1,999
    buyItNowPriceInPaise: 449900, // ₹4,499
    currentBid: 229900,
    currency: "INR",
    auctionEndDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    bidCount: 5,
    bidsHaveStarted: true,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-metal-lightning-l-drago-1-20260101/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-metal-lightning-l-drago-1-20260101/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.GOOD,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-05-19"),
    updatedAt: new Date("2026-05-22"),
  },
];

export const productsAuctionsSeedData: Partial<ProductDocument>[] = [
  ..._rawProductsAuctionsSeedData.map((a) => withTokens({
    ...a,
    listingType: PRODUCT_FIELDS.LISTING_TYPE_VALUES.AUCTION,
  })),
];
