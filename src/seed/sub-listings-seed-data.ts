/*
 * WHY: Seeds product variant listings (sub-listings) — alternate printings, conditions, and editions of the same card at different prices.
 * WHAT: Exports 12 sub-listings (variants) grouped under 3 parent products: Dark Magician (4 variants), Blue-Eyes White Dragon (4 variants), Pot of Greed (3 variants). Each variant uses identical card metadata to the parent but different price/condition/printEdition. Variants are queryable together via `product.card.cardNumber` matching on product detail pages. All in Kaiba Corp Card Vault. Status: all published or draft matching their parent.
 *
 * EXPORTS:
 *   productsSublistingsSeedData — Array of 12 sub-listing products with listingType:"standard"
 *
 * @tag domain:products
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import { ProductDocument } from "../features/products/schemas/firestore";
import { PRODUCT_FIELDS } from "../constants/field-names";

// Card ID mappings for YGOPRODECK image API
const CARD_IDS = {
  darkMagician: 46986414,
  blueEyesWhiteDragon: 89631139,
  potOfGreed: 55144522,
};

const _rawSublistingsSeedData: Partial<ProductDocument>[] = [
  // ────────────────────────────────────────────────────────────────────────────
  // Dark Magician LOB 1st Edition (parent: product-dark-magician-lob-1st) — 4 variants
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: "sublisting-dark-magician-lob-1st-nm",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "Dark Magician — LOB 1st Edition (NM)",
    slug: "sublisting-dark-magician-lob-1st-nm",
    description: "Dark Magician from Legend of Blue Eyes White Dragon (LOB) first edition printing in near mint condition.",
    price: 499900, // ₹4,999
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "standard" as const,
    categorySlugs: ["category-monster-cards", "category-singles"],
    images: [
      `https://images.ygoprodeck.com/images/cards/${CARD_IDS.darkMagician}.jpg`,
    ],

    stockQuantity: 1,
    isSold: false,
    availableQuantity: 1,
    customFields: [
      { key: "printEdition", type: "text", value: "LOB 1st Edition" },
      { key: "parentProductSlug", type: "text", value: "product-dark-magician-lob-1st" },
    ],
    customSections: [],
    featured: false,
    isPromoted: false,

    isOnSale: false,
    card: {
      setName: "Legend of Blue Eyes White Dragon",
      setYear: 1999,
      cardNumber: "1/40",
      rarity: "Super Rare",
      language: "en",
    },
    grading: { service: "PSA", grade: 8, certNumber: "PSA-YGO-001001" },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),

  },
  {
    id: "sublisting-dark-magician-lob-unlimited",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "Dark Magician — LOB Unlimited (NM)",
    slug: "sublisting-dark-magician-lob-unlimited",
    description: "Dark Magician from Legend of Blue Eyes White Dragon unlimited printing in near mint condition.",
    price: 299900, // ₹2,999
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "standard" as const,
    categorySlugs: ["category-monster-cards", "category-singles"],
    images: [
      `https://images.ygoprodeck.com/images/cards/${CARD_IDS.darkMagician}.jpg`,
    ],

    stockQuantity: 2,
    isSold: false,
    availableQuantity: 2,
    customFields: [
      { key: "printEdition", type: "text", value: "LOB Unlimited" },
      { key: "parentProductSlug", type: "text", value: "product-dark-magician-lob-1st" },
    ],
    customSections: [],
    featured: false,
    isPromoted: false,

    isOnSale: false,
    card: {
      setName: "Legend of Blue Eyes White Dragon",
      setYear: 1999,
      cardNumber: "1/40",
      rarity: "Super Rare",
      language: "en",
    },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),

  },
  {
    id: "sublisting-dark-magician-sdk",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "Dark Magician — SDK Reprint (NM)",
    slug: "sublisting-dark-magician-sdk",
    description: "Dark Magician from Starter Deck Kaiba reprint in near mint condition.",
    price: 149900, // ₹1,499
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "standard" as const,
    categorySlugs: ["category-monster-cards", "category-singles"],
    images: [
      `https://images.ygoprodeck.com/images/cards/${CARD_IDS.darkMagician}.jpg`,
    ],

    stockQuantity: 3,
    isSold: false,
    availableQuantity: 3,
    customFields: [
      { key: "printEdition", type: "text", value: "SDK Reprint" },
      { key: "parentProductSlug", type: "text", value: "product-dark-magician-lob-1st" },
    ],
    customSections: [],
    featured: false,
    isPromoted: false,

    isOnSale: false,
    card: {
      setName: "Starter Deck Kaiba",
      setYear: 2002,
      cardNumber: "SDY-006",
      rarity: "Super Rare",
      language: "en",
    },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),

  },
  {
    id: "sublisting-dark-magician-sdp",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "Dark Magician — SDP Reprint (LP)",
    slug: "sublisting-dark-magician-sdp",
    description: "Dark Magician from Starter Deck Pegasus reprint in lightly played condition.",
    price: 79900, // ₹799
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "standard" as const,
    categorySlugs: ["category-monster-cards", "category-singles"],
    images: [
      `https://images.ygoprodeck.com/images/cards/${CARD_IDS.darkMagician}.jpg`,
    ],

    stockQuantity: 1,
    isSold: false,
    availableQuantity: 1,
    customFields: [
      { key: "printEdition", type: "text", value: "SDP Reprint" },
      { key: "condition_detail", type: "text", value: "Lightly Played" },
      { key: "parentProductSlug", type: "text", value: "product-dark-magician-lob-1st" },
    ],
    customSections: [],
    featured: false,
    isPromoted: false,

    isOnSale: false,
    card: {
      setName: "Starter Deck Pegasus",
      setYear: 2002,
      cardNumber: "SDP-006",
      rarity: "Super Rare",
      language: "en",
    },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),

  },

  // ────────────────────────────────────────────────────────────────────────────
  // Blue-Eyes White Dragon SDK (parent: product-blue-eyes-white-dragon-sdk) — 4 variants
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: "sublisting-blue-eyes-lob-1st-nm",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "Blue-Eyes White Dragon — LOB 1st Edition (NM)",
    slug: "sublisting-blue-eyes-lob-1st-nm",
    description: "Blue-Eyes White Dragon from Legend of Blue Eyes White Dragon first edition printing in near mint condition.",
    price: 799900, // ₹7,999
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "standard" as const,
    categorySlugs: ["category-monster-cards", "category-singles"],
    images: [
      `https://images.ygoprodeck.com/images/cards/${CARD_IDS.blueEyesWhiteDragon}.jpg`,
    ],

    stockQuantity: 1,
    isSold: false,
    availableQuantity: 1,
    customFields: [
      { key: "printEdition", type: "text", value: "LOB 1st Edition" },
      { key: "parentProductSlug", type: "text", value: "product-blue-eyes-white-dragon-sdk" },
    ],
    customSections: [],
    featured: false,
    isPromoted: false,

    isOnSale: false,
    card: {
      setName: "Legend of Blue Eyes White Dragon",
      setYear: 1999,
      cardNumber: "1/40",
      rarity: "Ultra Rare",
      language: "en",
    },
    grading: { service: "PSA", grade: 9, certNumber: "PSA-YGO-001002" },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),

  },
  {
    id: "sublisting-blue-eyes-lob-unlimited",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "Blue-Eyes White Dragon — LOB Unlimited (NM)",
    slug: "sublisting-blue-eyes-lob-unlimited",
    description: "Blue-Eyes White Dragon from Legend of Blue Eyes White Dragon unlimited printing in near mint condition.",
    price: 499900, // ₹4,999
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "standard" as const,
    categorySlugs: ["category-monster-cards", "category-singles"],
    images: [
      `https://images.ygoprodeck.com/images/cards/${CARD_IDS.blueEyesWhiteDragon}.jpg`,
    ],

    stockQuantity: 2,
    isSold: false,
    availableQuantity: 2,
    customFields: [
      { key: "printEdition", type: "text", value: "LOB Unlimited" },
      { key: "parentProductSlug", type: "text", value: "product-blue-eyes-white-dragon-sdk" },
    ],
    customSections: [],
    featured: false,
    isPromoted: false,

    isOnSale: false,
    card: {
      setName: "Legend of Blue Eyes White Dragon",
      setYear: 1999,
      cardNumber: "1/40",
      rarity: "Ultra Rare",
      language: "en",
    },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),

  },
  {
    id: "sublisting-blue-eyes-sdk",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "Blue-Eyes White Dragon — SDK Reprint (NM)",
    slug: "sublisting-blue-eyes-sdk",
    description: "Blue-Eyes White Dragon from Starter Deck Kaiba reprint in near mint condition.",
    price: 249900, // ₹2,499
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "standard" as const,
    categorySlugs: ["category-monster-cards", "category-singles"],
    images: [
      `https://images.ygoprodeck.com/images/cards/${CARD_IDS.blueEyesWhiteDragon}.jpg`,
    ],

    stockQuantity: 3,
    isSold: false,
    availableQuantity: 3,
    customFields: [
      { key: "printEdition", type: "text", value: "SDK Reprint" },
      { key: "parentProductSlug", type: "text", value: "product-blue-eyes-white-dragon-sdk" },
    ],
    customSections: [],
    featured: false,
    isPromoted: false,

    isOnSale: false,
    card: {
      setName: "Starter Deck Kaiba",
      setYear: 2002,
      cardNumber: "SDY-006",
      rarity: "Ultra Rare",
      language: "en",
    },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),

  },
  {
    id: "sublisting-blue-eyes-kaiba-tin",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "Blue-Eyes White Dragon — 2002 Tin Promo (NM)",
    slug: "sublisting-blue-eyes-kaiba-tin",
    description: "Blue-Eyes White Dragon from 2002 Kaiba tin promo in near mint condition.",
    price: 399900, // ₹3,999
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "standard" as const,
    categorySlugs: ["category-monster-cards", "category-singles"],
    images: [
      `https://images.ygoprodeck.com/images/cards/${CARD_IDS.blueEyesWhiteDragon}.jpg`,
    ],

    stockQuantity: 1,
    isSold: false,
    availableQuantity: 1,
    customFields: [
      { key: "printEdition", type: "text", value: "2002 Tin Promo" },
      { key: "parentProductSlug", type: "text", value: "product-blue-eyes-white-dragon-sdk" },
    ],
    customSections: [],
    featured: false,
    isPromoted: false,

    isOnSale: false,
    card: {
      setName: "2002 Tin Promotional",
      setYear: 2002,
      cardNumber: "TIN-006",
      rarity: "Secret Rare",
      language: "en",
    },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),

  },

  // ────────────────────────────────────────────────────────────────────────────
  // Pot of Greed LOB (parent: product-pot-of-greed-lob) — 3 variants
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: "sublisting-pot-of-greed-lob-1st",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "Pot of Greed — LOB 1st Edition (NM)",
    slug: "sublisting-pot-of-greed-lob-1st",
    description: "Pot of Greed from Legend of Blue Eyes White Dragon first edition printing in near mint condition.",
    price: 1499900, // ₹14,999
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "standard" as const,
    categorySlugs: ["category-spell-cards", "category-singles"],
    images: [
      `https://images.ygoprodeck.com/images/cards/${CARD_IDS.potOfGreed}.jpg`,
    ],

    stockQuantity: 1,
    isSold: false,
    availableQuantity: 1,
    customFields: [
      { key: "printEdition", type: "text", value: "LOB 1st Edition" },
      { key: "parentProductSlug", type: "text", value: "product-pot-of-greed-lob" },
    ],
    customSections: [],
    featured: false,
    isPromoted: false,

    isOnSale: false,
    card: {
      setName: "Legend of Blue Eyes White Dragon",
      setYear: 1999,
      cardNumber: "21/40",
      rarity: "Ultra Rare",
      language: "en",
    },
    grading: { service: "PSA", grade: 9, certNumber: "PSA-YGO-001003" },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),

  },
  {
    id: "sublisting-pot-of-greed-lob-unlimited",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "Pot of Greed — LOB Unlimited (NM)",
    slug: "sublisting-pot-of-greed-lob-unlimited",
    description: "Pot of Greed from Legend of Blue Eyes White Dragon unlimited printing in near mint condition.",
    price: 999900, // ₹9,999
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "standard" as const,
    categorySlugs: ["category-spell-cards", "category-singles"],
    images: [
      `https://images.ygoprodeck.com/images/cards/${CARD_IDS.potOfGreed}.jpg`,
    ],

    stockQuantity: 2,
    isSold: false,
    availableQuantity: 2,
    customFields: [
      { key: "printEdition", type: "text", value: "LOB Unlimited" },
      { key: "parentProductSlug", type: "text", value: "product-pot-of-greed-lob" },
    ],
    customSections: [],
    featured: false,
    isPromoted: false,

    isOnSale: false,
    card: {
      setName: "Legend of Blue Eyes White Dragon",
      setYear: 1999,
      cardNumber: "21/40",
      rarity: "Ultra Rare",
      language: "en",
    },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),

  },
  {
    id: "sublisting-pot-of-greed-mrl",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "Pot of Greed — MRL Reprint (NM)",
    slug: "sublisting-pot-of-greed-mrl",
    description: "Pot of Greed from Metal Raiders reprint in near mint condition.",
    price: 599900, // ₹5,999
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "standard" as const,
    categorySlugs: ["category-spell-cards", "category-singles"],
    images: [
      `https://images.ygoprodeck.com/images/cards/${CARD_IDS.potOfGreed}.jpg`,
    ],

    stockQuantity: 2,
    isSold: false,
    availableQuantity: 2,
    customFields: [
      { key: "printEdition", type: "text", value: "MRL Reprint" },
      { key: "parentProductSlug", type: "text", value: "product-pot-of-greed-lob" },
    ],
    customSections: [],
    featured: false,
    isPromoted: false,

    isOnSale: false,
    card: {
      setName: "Metal Raiders",
      setYear: 2000,
      cardNumber: "94/165",
      rarity: "Ultra Rare",
      language: "en",
    },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),

  },
];

export const productsSublistingsSeedData = _rawSublistingsSeedData.map((p) => ({
  ...p,
  listingType: "standard" as const,
}));
