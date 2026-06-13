/*
 * WHY: Seeds grouped product listings — bundles where the parent and individual children are each purchasable separately (ETB model).
 * WHAT: Exports 3 grouped listings (parents only; children are existing standard product documents referenced via groupChildSlugs): LOB Booster Box with single pack + promo child, Kaiba Structure Deck with 2–3 singles + trap child, POTD Booster Box with single pack + promo child. Groups use the existing groupId/isGroupParent/groupChildSlugs schema fields. All in Kaiba Corp Card Vault. Status: all published.
 *
 * EXPORTS:
 *   groupedListingsSeedData — Array of 3 grouped product parents with isGroupParent:true and groupChildSlugs[]
 *
 * @tag domain:products,bundles
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import { ProductDocument } from "../features/products/schemas/firestore";
import { PRODUCT_FIELDS } from "../constants/field-names";
import { seedExtMedia } from "./_helpers/media";

// Card ID mappings for YGOPRODECK image API
const CARD_IDS = {
  blueEyesWhiteDragon: 89631139,
  kaibaTin: 89631139,
  potOfGreed: 55144522,
};

const _rawGroupedListingsSeedData: Partial<ProductDocument>[] = [
  // ────────────────────────────────────────────────────────────────────────────
  // Group 1: LOB Booster Box with single pack + promo
  // Parent: product-lob-booster-box-sealed (full box)
  // Children: product-lob-booster-pack (single), product-lob-special-promo-harpie-lady (promo)
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: "group-lob-booster-box",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "LOB Booster Box — Complete Sealed Box (24 Packs)",
    slug: "group-lob-booster-box",
    description:
      "Legend of Blue Eyes White Dragon complete booster box containing 24 sealed booster packs. This is the parent product; you can also purchase individual packs or the promo card separately.",
    price: 999900, // ₹9,999
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "standard" as const,
    categorySlugs: ["category-booster-boxes", "category-sealed-products"],
    images: [
      seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.blueEyesWhiteDragon}.jpg`),
    ],

    stockQuantity: 1,
    isSold: false,
    availableQuantity: 1,
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,

    isOnSale: false,
    isGroupParent: true,
    groupId: "group-lob-booster-box",
    groupTitle: "LOB Booster Box & Components",
    groupChildSlugs: [
      "product-lob-booster-pack",
      "product-lob-special-promo-harpie-lady",
    ],
    card: {
      setName: "Legend of Blue Eyes White Dragon",
      setYear: 1999,
      rarity: "Mixed",
      language: "en",
    },
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Group 2: Kaiba Structure Deck with singles + trap
  // Parent: product-kaiba-starter-deck (full deck)
  // Children: product-blue-eyes-white-dragon-sdk (key pull), product-shrink-sdk (foil tech), product-the-dragon-dwelling-in-cave (budget filler)
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: "group-kaiba-structure-deck",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "Starter Deck: Kaiba — Complete Sealed Deck",
    slug: "group-kaiba-structure-deck",
    description:
      "Starter Deck: Kaiba — complete sealed deck in original packaging. Buy the full deck or select key singles like Blue-Eyes White Dragon separately.",
    price: 199900, // ₹1,999
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "standard" as const,
    categorySlugs: ["category-starter-structure", "category-sealed-products"],
    images: [
      seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.kaibaTin}.jpg`),
    ],

    stockQuantity: 3,
    isSold: false,
    availableQuantity: 3,
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,

    isOnSale: false,
    isGroupParent: true,
    groupId: "group-kaiba-structure-deck",
    groupTitle: "Kaiba Starter Deck & Key Singles",
    groupChildSlugs: [
      "sublisting-blue-eyes-sdk",
      "product-shrink-sdk",
      "product-the-dragon-dwelling-in-cave",
    ],
    card: {
      setName: "Starter Deck Kaiba",
      setYear: 2002,
      rarity: "Mixed",
      language: "en",
    },
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Group 3: POTD Booster Box with single pack + promo
  // Parent: product-potd-booster-box (full box)
  // Children: product-potd-booster-pack-single (single pack), product-elemental-hero-neos (pull promo)
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: "group-potd-booster-box",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "POTD Booster Box — Complete Sealed Box (24 Packs)",
    slug: "group-potd-booster-box",
    description:
      "Power of the Duelist complete booster box containing 24 sealed booster packs. Purchase the full box or individual packs and the featured promo card separately.",
    price: 899900, // ₹8,999
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "standard" as const,
    categorySlugs: ["category-booster-boxes", "category-sealed-products"],
    images: [
      seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.blueEyesWhiteDragon}.jpg`),
    ],

    stockQuantity: 2,
    isSold: false,
    availableQuantity: 2,
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,

    isOnSale: false,
    isGroupParent: true,
    groupId: "group-potd-booster-box",
    groupTitle: "POTD Booster Box & Components",
    groupChildSlugs: [
      "product-potd-booster-pack-single",
      "product-elemental-hero-neos",
    ],
    card: {
      setName: "Power of the Duelist",
      setYear: 2005,
      rarity: "Mixed",
      language: "en",
    },
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  },
];

export const groupedListingsSeedData = _rawGroupedListingsSeedData.map((p) => ({
  ...p,
  listingType: "standard" as const,
}));
