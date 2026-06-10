/*
 * WHY: Seeds pre-order product listings for the YGO marketplace, allowing customers to reserve upcoming releases with deposit payments.
 * WHAT: Exports 5 pre-order products (25th Anniversary LOB reprint, GX Tournament Pack 2026, Blue-Eyes Collector Tin, Dark Magician Structure Deck, Master Duel Promo Bundle). All in Kaiba Corp Card Vault. Delivery dates range +30 to +120 days from seed time. Deposit percentages 25% standard. Production status ranges from "upcoming" to "in_production". Images from YGOPRODECK free API. Status: 3 published, 2 draft.
 *
 * EXPORTS:
 *   productsPreordersSeedData — Array of 5 pre-order products with listingType:"pre-order"
 *
 * @tag domain:products,pre-orders
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import { ProductDocument } from "../features/products/schemas/firestore";
import { PRODUCT_FIELDS } from "../constants/field-names";
import { buildSearchTokens } from "../utils/search-tokens";
import { seedExtMedia } from "./_helpers/media";

// Card ID mappings for YGOPRODECK image API
const CARD_IDS = {
  blueEyesWhiteDragon: 89631139,
  darkMagician: 46986414,
  elementalHeroNeos: 89943723,
};

const _rawPreordersSeedData: Partial<ProductDocument>[] = [
  {
    id: "preorder-25th-anniversary-lob",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "25th Anniversary LOB Reprint",
    slug: "preorder-25th-anniversary-lob",
    description:
      "Highly anticipated 25th Anniversary reprint of the classic Legend of Blue Eyes White Dragon booster set. Limited production run. Secure your allocation now.",
    price: 299900, // ₹2,999
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "pre-order" as const,
    categorySlugs: ["category-sealed-products", "category-booster-boxes"],
    images: [
      seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.blueEyesWhiteDragon}.jpg`),
    ],
    isSold: false,
    availableQuantity: 1,
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    preOrderDeliveryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // +90 days
    preOrderProductionStatus: "in_production",
    preOrderDepositPercent: 25,
    preOrderMaxQuantity: 100,
    preOrderCurrentCount: 42,
    preOrderCancellable: true,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // -14 days
    updatedAt: new Date(),
  },
  {
    id: "preorder-gx-tournament-pack-2026",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "GX Tournament Pack 2026",
    slug: "preorder-gx-tournament-pack-2026",
    description:
      "Official tournament pack from Konami featuring exclusive GX era promos and tournament-legal deck staples. Perfect for competitive players.",
    price: 199900, // ₹1,999
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "pre-order" as const,
    categorySlugs: ["category-sealed-products", "category-booster-packs"],
    images: [
      seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.elementalHeroNeos}.jpg`),
    ],
    isSold: false,
    availableQuantity: 1,
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    preOrderDeliveryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // +60 days
    preOrderProductionStatus: "upcoming",
    preOrderDepositPercent: 25,
    preOrderMaxQuantity: 150,
    preOrderCurrentCount: 67,
    preOrderCancellable: true,
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // -21 days
    updatedAt: new Date(),
  },
  {
    id: "preorder-blue-eyes-collector-tin",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "Blue-Eyes Collector Tin 2026",
    slug: "preorder-blue-eyes-collector-tin",
    description:
      "Premium collector's edition tin featuring Blue-Eyes artwork and exclusive foil promos. Mint condition guaranteed on delivery.",
    price: 399900, // ₹3,999
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    listingType: "pre-order" as const,
    categorySlugs: ["category-sealed-products", "category-collector-tins"],
    images: [
      seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.blueEyesWhiteDragon}.jpg`),
    ],
    isSold: false,
    availableQuantity: 1,
    customFields: [],
    customSections: [],
    featured: true,
    isPromoted: false,
    isOnSale: false,
    preOrderDeliveryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // +45 days
    preOrderProductionStatus: "in_production",
    preOrderDepositPercent: 25,
    preOrderMaxQuantity: 200,
    preOrderCurrentCount: 156,
    preOrderCancellable: true,
    createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // -28 days
    updatedAt: new Date(),
  },
  {
    id: "preorder-dark-magician-struct-2026",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "Dark Magician Structure Deck 2026",
    slug: "preorder-dark-magician-struct-2026",
    description:
      "Definitive Dark Magician structure deck for 2026 with updated support cards and powerful synergies. Perfect starter deck for new players.",
    price: 149900, // ₹1,499
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    status: PRODUCT_FIELDS.STATUS_VALUES.DRAFT,
    listingType: "pre-order" as const,
    categorySlugs: ["category-sealed-products", "category-starter-structure"],
    images: [
      seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.darkMagician}.jpg`),
    ],
    isSold: false,
    availableQuantity: 1,
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    preOrderDeliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
    preOrderProductionStatus: "upcoming",
    preOrderDepositPercent: 25,
    preOrderMaxQuantity: 250,
    preOrderCurrentCount: 89,
    preOrderCancellable: true,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // -7 days
    updatedAt: new Date(),
  },
  {
    id: "preorder-master-duel-promo-bundle",
    storeId: "store-kaiba-corp-cards",
    brandSlug: "brand-konami",
    title: "Master Duel Promo Physical Bundle",
    slug: "preorder-master-duel-promo-bundle",
    description:
      "Exclusive physical bundle of cards obtained from Master Duel game rewards. Ultra-rare promotional cards in premium condition.",
    price: 499900, // ₹4,999
    currency: "INR",
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    status: PRODUCT_FIELDS.STATUS_VALUES.DRAFT,
    listingType: "pre-order" as const,
    categorySlugs: ["category-sealed-products", "category-booster-boxes"],
    images: [
      seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.elementalHeroNeos}.jpg`),
    ],
    isSold: false,
    availableQuantity: 1,
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: true,
    isOnSale: false,
    preOrderDeliveryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // +120 days
    preOrderProductionStatus: "upcoming",
    preOrderDepositPercent: 25,
    preOrderMaxQuantity: 75,
    preOrderCurrentCount: 34,
    preOrderCancellable: true,
    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // -35 days
    updatedAt: new Date(),
  },
];

export const productsPreordersSeedData = _rawPreordersSeedData.map((p) => ({
  tags: [] as string[],
  stockQuantity: p.availableQuantity ?? 1,
  mainImage: p.images?.[0] ?? "",
  ...p,
  listingType: "pre-order" as const,
  searchTokens: buildSearchTokens(
    p.title, p.description, p.brand, p.brandSlug,
    p.categoryNames, p.tags, p.features, p.condition,
    p.card?.setName, p.card?.cardNumber,
    p.specifications?.map((s) => `${s.name} ${s.value}`),
  ),
}));
