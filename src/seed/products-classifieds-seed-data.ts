/**
 * Classified Products Seed Data — Yu-Gi-Oh! Theme (SB-UNI-I)
 *
 * Stored as ProductDocument with listingType: "classified". These are
 * meetup/local-sale items — no cart flow, CTA routes to chat.
 *
 * Prices in INR paise (₹1 = 100 paise).
 */

import type { ProductDocument } from "../features/products/schemas/firestore";
import { PRODUCT_FIELDS } from "../constants/field-names";
import { buildSearchTokens } from "../utils/search-tokens";

function withTokens(p: Partial<ProductDocument>): Partial<ProductDocument> {
  return {
    tags: [],
    featured: false,
    ...p,
    searchTokens: buildSearchTokens(
      p.title, p.description, p.brand, p.brandSlug,
      p.categoryNames, p.tags, p.features, p.condition,
      p.card?.setName, p.card?.cardNumber,
      p.grading?.service,
      p.specifications?.map((s) => `${s.name} ${s.value}`),
    ),
  };
}

const CARD_IDS = {
  blueEyesWhiteDragon: 89631139,
  darkMagician: 46986414,
  exodiaHead: 33396948,
  jinzo: 77585513,
  busterBlader: 78193831,
  kuriboh: 40640057,
  gaiaFierceKnight: 6368038,
  potOfGreed: 55144522,
};

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const _rawClassifiedsSeedData: Partial<ProductDocument>[] = [
  {
    id: "classified-blue-eyes-lot-mumbai",
    slug: "classified-blue-eyes-lot-mumbai",
    title: "Blue-Eyes White Dragon Lot — 3 NM copies, meetup Mumbai",
    description:
      "Selling 3 near-mint Blue-Eyes White Dragon (SDK-001) from my personal binder. All Ultra Rare, English, unlimited. Prefer meetup near Andheri station; can ship if buyer covers postage. Price negotiable for the lot.",
    categorySlugs: ["category-singles"],
    categoryNames: ["Singles"],
    brand: "Konami",
    brandSlug: "brand-konami",
    price: 450000,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    mainImage: `https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.blueEyesWhiteDragon}.jpg`,
    images: [
      `https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.blueEyesWhiteDragon}.jpg`,
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-kaiba-corp-cards",
    storeName: "Kaiba Corp Card Vault",
    tags: ["blue-eyes", "classified", "meetup", "mumbai", "lot", "nm"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    classified: {
      meetupArea: { city: "Mumbai", locality: "Andheri West", pincode: "400058" },
      contactMethod: "both",
      acceptsShipping: true,
      negotiable: true,
    },
    allowOffers: false,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },
  {
    id: "classified-exodia-set-bangalore",
    slug: "classified-exodia-set-bangalore",
    title: "Complete Exodia Set — LP, Bangalore meetup only",
    description:
      "All 5 pieces of Exodia (LOB) in lightly played condition. No shipping — meetup only near Koramangala or MG Road. Cash or UPI accepted.",
    categorySlugs: ["category-singles"],
    categoryNames: ["Singles"],
    brand: "Konami",
    brandSlug: "brand-konami",
    price: 1200000,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    mainImage: `https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.exodiaHead}.jpg`,
    images: [
      `https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.exodiaHead}.jpg`,
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    tags: ["exodia", "classified", "meetup", "bangalore", "complete-set"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    classified: {
      meetupArea: { city: "Bangalore", locality: "Koramangala", pincode: "560034" },
      contactMethod: "chat",
      acceptsShipping: false,
      negotiable: false,
    },
    allowOffers: false,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(2),
  },
  {
    id: "classified-jinzo-vintage-delhi",
    slug: "classified-jinzo-vintage-delhi",
    title: "Jinzo PSV-000 Secret Rare — Delhi NCR meetup",
    description:
      "Vintage Jinzo Secret Rare from Pharaoh's Servant (PSV-000). Card is moderately played with minor edge wear. Great for a binder display piece. Meetup anywhere in Delhi NCR.",
    categorySlugs: ["category-singles"],
    categoryNames: ["Singles"],
    brand: "Konami",
    brandSlug: "brand-konami",
    price: 350000,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    mainImage: `https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.jinzo}.jpg`,
    images: [
      `https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.jinzo}.jpg`,
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-kaiba-corp-cards",
    storeName: "Kaiba Corp Card Vault",
    tags: ["jinzo", "classified", "meetup", "delhi", "vintage", "secret-rare"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    classified: {
      meetupArea: { city: "Delhi", locality: "Connaught Place" },
      contactMethod: "both",
      acceptsShipping: false,
      negotiable: true,
    },
    allowOffers: false,
    createdAt: daysAgo(7),
    updatedAt: daysAgo(3),
  },
  {
    id: "classified-binder-collection-hyderabad",
    slug: "classified-binder-collection-hyderabad",
    title: "200+ YGO Bulk Lot — Binder clearout, Hyderabad",
    description:
      "Clearing my old binder: 200+ cards from LOB, MRD, PSV, and SDK. Mostly commons and rares, a few holos sprinkled in. Perfect for beginners building a collection. Meetup preferred, can ship COD within Telangana.",
    categorySlugs: ["category-sealed-products"],
    categoryNames: ["Sealed Products"],
    brand: "Konami",
    brandSlug: "brand-konami",
    price: 150000,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    mainImage: `https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.kuriboh}.jpg`,
    images: [
      `https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.kuriboh}.jpg`,
      `https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.gaiaFierceKnight}.jpg`,
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    tags: ["bulk", "classified", "meetup", "hyderabad", "binder", "beginner"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    classified: {
      meetupArea: { city: "Hyderabad", locality: "Banjara Hills", pincode: "500034" },
      contactMethod: "chat",
      acceptsShipping: true,
      negotiable: true,
    },
    allowOffers: false,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: "classified-dark-magician-girl-chennai",
    slug: "classified-dark-magician-girl-chennai",
    title: "Pot of Greed — 1st Ed LOB, Chennai meetup",
    description:
      "1st Edition Pot of Greed from Legend of Blue Eyes. Near-mint, never played. Meetup near T. Nagar or Anna Nagar. UPI payment only.",
    categorySlugs: ["category-singles"],
    categoryNames: ["Singles"],
    brand: "Konami",
    brandSlug: "brand-konami",
    price: 280000,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    mainImage: `https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.potOfGreed}.jpg`,
    images: [
      `https://images.ygoprodeck.com/images/cards/cropped/${CARD_IDS.potOfGreed}.jpg`,
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-kaiba-corp-cards",
    storeName: "Kaiba Corp Card Vault",
    tags: ["pot-of-greed", "classified", "meetup", "chennai", "1st-edition"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    classified: {
      meetupArea: { city: "Chennai", locality: "T. Nagar", pincode: "600017" },
      contactMethod: "chat",
      acceptsShipping: false,
      negotiable: false,
    },
    allowOffers: false,
    createdAt: daysAgo(4),
    updatedAt: daysAgo(1),
  },
];

export const productsClassifiedsSeedData: Partial<ProductDocument>[] =
  _rawClassifiedsSeedData.map((p) => withTokens({
    ...p,
    listingType: "classified" as const,
  }));
