/**
 * Digital-Code Products Seed Data — Yu-Gi-Oh! Theme (SB-UNI-J)
 *
 * Stored as ProductDocument with listingType: "digital-code". Instant
 * digital fulfillment — no shipping address, code delivered on payment.
 *
 * Prices in INR paise (₹1 = 100 paise).
 */

import type { ProductDocument } from "../features/products/schemas/firestore";
import { PRODUCT_FIELDS } from "../constants/field-names";
import { buildSearchTokens } from "../utils/search-tokens";
import { seedExtMedia } from "./_helpers/media";

function withTokens(p: Partial<ProductDocument>): Partial<ProductDocument> {
  return {
    tags: [],
    featured: false,
    ...p,
    searchTokens: buildSearchTokens(
      p.title, p.description, p.brand, p.brandSlug,
      p.categoryNames, p.tags, p.features, p.condition,
    ),
  };
}

const CARD_IDS = {
  darkMagician: 46986414,
  blueEyesWhiteDragon: 89631139,
  elementalHeroNeos: 89943723,
  cyberDragon: 70095154,
  obeliskTheTormentor: 10000015,
};

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

const _rawDigitalCodesSeedData: Partial<ProductDocument>[] = [
  {
    id: "digitalcode-master-duel-gems-1000",
    slug: "digitalcode-master-duel-gems-1000",
    title: "Yu-Gi-Oh! Master Duel — 1000 Gems Code",
    description:
      "Instant delivery: 1000 Gems redemption code for Yu-Gi-Oh! Master Duel (all platforms). Code sent via order detail page immediately after payment. One code per account.",
    categorySlugs: ["category-digital-codes"],
    categoryNames: ["Digital Codes"],
    brand: "Konami",
    brandSlug: "brand-konami",
    price: 49900,
    currency: "INR",
    stockQuantity: 50,
    availableQuantity: 50,
    mainImage: seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.darkMagician}.jpg`),
    images: [
      seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.darkMagician}.jpg`),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    tags: ["master-duel", "gems", "digital-code", "instant-delivery"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    digitalCode: {
      codeDeliveryMethod: "auto-claim",
      codePoolSize: 50,
      codesAvailable: 50,
      redemptionInstructions:
        "Open Yu-Gi-Oh! Master Duel → Settings → Redeem Code → paste the code. Gems are credited instantly.",
      expiresAt: daysAhead(90),
    },
    maxPerUser: 3,
    allowOffers: false,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  },
  {
    id: "digitalcode-master-duel-structure-deck",
    slug: "digitalcode-master-duel-structure-deck",
    title: "Master Duel — Blue-Eyes Structure Deck Unlock Code",
    description:
      "Unlock code for the Blue-Eyes White Dragon structure deck in Yu-Gi-Oh! Master Duel. Includes 3× Blue-Eyes, Dragon Spirit of White, and all staples. Auto-delivered after payment.",
    categorySlugs: ["category-digital-codes"],
    categoryNames: ["Digital Codes"],
    brand: "Konami",
    brandSlug: "brand-konami",
    price: 29900,
    currency: "INR",
    stockQuantity: 25,
    availableQuantity: 25,
    mainImage: seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.blueEyesWhiteDragon}.jpg`),
    images: [
      seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.blueEyesWhiteDragon}.jpg`),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    tags: ["master-duel", "structure-deck", "blue-eyes", "digital-code"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    digitalCode: {
      codeDeliveryMethod: "auto-claim",
      codePoolSize: 25,
      codesAvailable: 25,
      redemptionInstructions:
        "Open Master Duel → Shop → Redeem → paste code. The structure deck appears in your deck list.",
      expiresAt: daysAhead(60),
    },
    maxPerUser: 1,
    allowOffers: false,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },
  {
    id: "digitalcode-duel-links-gems-500",
    slug: "digitalcode-duel-links-gems-500",
    title: "Duel Links — 500 Gems Redemption Code",
    description:
      "500 Gems for Yu-Gi-Oh! Duel Links (iOS / Android / Steam). Code delivered on order detail page. Valid for 30 days from purchase.",
    categorySlugs: ["category-digital-codes"],
    categoryNames: ["Digital Codes"],
    brand: "Konami",
    brandSlug: "brand-konami",
    price: 19900,
    currency: "INR",
    stockQuantity: 100,
    availableQuantity: 100,
    mainImage: seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.elementalHeroNeos}.jpg`),
    images: [
      seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.elementalHeroNeos}.jpg`),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-kaiba-corp-cards",
    storeName: "Kaiba Corp Card Vault",
    tags: ["duel-links", "gems", "digital-code", "mobile"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    digitalCode: {
      codeDeliveryMethod: "auto-claim",
      codePoolSize: 100,
      codesAvailable: 100,
      redemptionInstructions:
        "Duel Links → Settings → Campaign → Enter Gift Code. Gems credited within 5 minutes.",
      expiresAt: daysAhead(30),
    },
    maxPerUser: 5,
    allowOffers: false,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: "digitalcode-neuron-premium-1yr",
    slug: "digitalcode-neuron-premium-1yr",
    title: "Yu-Gi-Oh! Neuron Premium — 1 Year Subscription Code",
    description:
      "1-year premium subscription code for the official Yu-Gi-Oh! Neuron companion app. Unlocks advanced deck builder, tournament brackets, card scanner, and life-point tracker. Sent via email within 1 hour.",
    categorySlugs: ["category-digital-codes"],
    categoryNames: ["Digital Codes"],
    brand: "Konami",
    brandSlug: "brand-konami",
    price: 99900,
    currency: "INR",
    stockQuantity: 20,
    availableQuantity: 20,
    mainImage: seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.cyberDragon}.jpg`),
    images: [
      seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.cyberDragon}.jpg`),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    tags: ["neuron", "premium", "subscription", "digital-code", "companion-app"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    digitalCode: {
      codeDeliveryMethod: "manual-email",
      codePoolSize: 20,
      codesAvailable: 20,
      redemptionInstructions:
        "Open Yu-Gi-Oh! Neuron → Settings → Subscription → Redeem Code. Premium features unlock immediately.",
      expiresAt: daysAhead(180),
    },
    maxPerUser: 1,
    allowOffers: false,
    createdAt: daysAgo(8),
    updatedAt: daysAgo(2),
  },
  {
    id: "digitalcode-master-duel-battle-pass",
    slug: "digitalcode-master-duel-battle-pass",
    title: "Master Duel — Gold Duel Pass (Current Season)",
    description:
      "Gold Duel Pass unlock code for the current Master Duel season. Unlocks all premium rewards on the battle pass track. Auto-delivered.",
    categorySlugs: ["category-digital-codes"],
    categoryNames: ["Digital Codes"],
    brand: "Konami",
    brandSlug: "brand-konami",
    price: 79900,
    currency: "INR",
    stockQuantity: 30,
    availableQuantity: 30,
    mainImage: seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.obeliskTheTormentor}.jpg`),
    images: [
      seedExtMedia(`https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.obeliskTheTormentor}.jpg`),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-kaiba-corp-cards",
    storeName: "Kaiba Corp Card Vault",
    tags: ["master-duel", "battle-pass", "gold", "digital-code", "season"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    digitalCode: {
      codeDeliveryMethod: "auto-claim",
      codePoolSize: 30,
      codesAvailable: 30,
      redemptionInstructions:
        "Master Duel → Duel Pass → Upgrade → Redeem Code. Premium track unlocks retroactively for all earned levels.",
      expiresAt: daysAhead(45),
    },
    maxPerUser: 1,
    allowOffers: false,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

export const productsDigitalCodesSeedData: Partial<ProductDocument>[] =
  _rawDigitalCodesSeedData.map((p) => withTokens({
    ...p,
    listingType: "digital-code" as const,
  }));
