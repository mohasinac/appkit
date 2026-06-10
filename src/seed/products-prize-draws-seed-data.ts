/**
 * Prize-Draw Products Seed Data — Collectibles Edition (SB5-E)
 *
 * Stored as ProductDocument with listingType: "prize-draw". Each draw lists
 * 3–16 PrizeDrawItem entries; one is revealed per paid order via crypto.randomInt
 * during the reveal window (see /api/prize-draws/[id]/reveal, SB4-H).
 *
 * Prices in INR paise (₹1 = 100 paise).
 */

import type {
  ProductDocument,
  PrizeDrawItem,
} from "../features/products/schemas";
import { PRODUCT_FIELDS, SCHEMA_DEFAULTS } from "../constants/field-names";
import { buildSearchTokens } from "../utils/search-tokens";
import { seedExtMedia } from "./_helpers/media";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

const _rawProductsPrizeDrawsSeedData: Partial<ProductDocument>[] = [
  // 1. Pokémon Mystery Box — June
  {
    id: "prize-pokemon-mystery-box-june",
    slug: "prize-pokemon-mystery-box-june",
    title: "Pokémon Mystery Box — June Mega Draw",
    description:
      "10 sealed Pokémon TCG mystery prizes. Each entry gives you a fair shot at one of the 10 prizes — from a Charizard-themed ETB to a genuine PSA 9 Base Set holo. Reveal opens June 25, 10:00 IST. Non-refundable digital entry.",
    categorySlugs: ["category-pokemon-tcg"],
    categoryNames: ["Pokémon TCG"],
    brand: "The Pokémon Company",
    brandSlug: "brand-pokemon-company",
    price: 500, // ₹5 per entry (matches pricePerEntry; price is the unit cost for cart totals)
    currency: SCHEMA_DEFAULTS.CURRENCY,
    stockQuantity: 50,
    availableQuantity: 50,
    mainImage:
      seedExtMedia("https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&h=800&fit=crop"),
    images: [
      seedExtMedia("https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&h=800&fit=crop"),
      seedExtMedia("https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&h=800&fit=crop"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeName: "Pokémon Palace",
    storeId: "store-pokemon-palace",
    featured: true,
    isPromoted: true,
    tags: [
      "pokemon",
      "prize-draw",
      "mystery-box",
      "tcg",
      "charizard",
      "fair-rng",
    ],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    listingType: "prize-draw",
    pricePerEntry: 500,
    prizeMaxEntries: 50,
    prizeCurrentEntries: 0,
    prizeRevealWindowStart: daysAhead(5),
    prizeRevealWindowEnd: daysAhead(12),
    prizeRevealStatus: "pending",
    prizeRevealDeadlineDays: 3,
    prizeGithubFileUrl:
      "https://github.com/letitripin/proof-of-fairness/blob/main/draws/prize-pokemon-mystery-box-june.json",
    maxPerUser: 5,
    prizeDrawItems: _pokemonPrizeItems(),
    shippingInfo:
      "Each physical prize ships separately within 5 business days of reveal. Reveal digitally first, then we ship.",
    returnPolicy:
      "Prize-draw entries are non-refundable once the reveal window opens. Pool-exhausted entries auto-refund.",
    allowOffers: false,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
  },

  // 2. Hot Wheels Treasure Hunt
  {
    id: "prize-hot-wheels-treasure-hunt",
    slug: "prize-hot-wheels-treasure-hunt",
    title: "Hot Wheels Super Treasure Hunt Draw",
    description:
      "8 confirmed Super Treasure Hunt Hot Wheels — including a 1969 Volkswagen Squareback, Datsun 510, and Custom Mustang. Single entry, single reveal, single prize. RNG verified post-reveal on GitHub.",
    categorySlugs: ["category-diecast-vehicles"],
    categoryNames: ["Diecast Vehicles"],
    brand: "Hot Wheels",
    brandSlug: "brand-hot-wheels",
    price: 29900, // ₹299 per entry
    currency: SCHEMA_DEFAULTS.CURRENCY,
    stockQuantity: 100,
    availableQuantity: 100,
    mainImage:
      seedExtMedia("https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&h=800&fit=crop"),
    images: [
      seedExtMedia("https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&h=800&fit=crop"),
      seedExtMedia("https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=800&fit=crop"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeName: "Diecast Depot",
    storeId: "store-diecast-depot",
    featured: true,
    isPromoted: false,
    tags: [
      "hot-wheels",
      "prize-draw",
      "super-treasure-hunt",
      "diecast",
      "fair-rng",
    ],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    listingType: "prize-draw",
    pricePerEntry: 29900,
    prizeMaxEntries: 100,
    prizeCurrentEntries: 0,
    prizeRevealWindowStart: daysAhead(7),
    prizeRevealWindowEnd: daysAhead(14),
    prizeRevealStatus: "pending",
    prizeRevealDeadlineDays: 3,
    prizeGithubFileUrl:
      "https://github.com/letitripin/proof-of-fairness/blob/main/draws/prize-hot-wheels-treasure-hunt.json",
    maxPerUser: 10,
    prizeDrawItems: _hotWheelsPrizeItems(),
    shippingInfo:
      "Each prize ships within 5 business days of reveal. Insured for declared value.",
    returnPolicy:
      "Prize-draw entries are non-refundable once the reveal window opens. Pool-exhausted entries auto-refund.",
    allowOffers: false,
    createdAt: daysAgo(8),
    updatedAt: daysAgo(1),
  },
];

function _pokemonPrizeItems(): PrizeDrawItem[] {
  return [
    {
      itemNumber: 1,
      title: "Charizard-themed Elite Trainer Box (sealed)",
      description: "Scarlet & Violet 151 ETB featuring Charizard art.",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=600&h=600&fit=crop"),
      ],
      condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
      estimatedValue: 549900,
      isWon: false,
    },
    {
      itemNumber: 2,
      title: "PSA 9 Base Set Blastoise Holo (#2/102)",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&h=600&fit=crop"),
      ],
      condition: "graded",
      estimatedValue: 1249900,
      isWon: false,
    },
    {
      itemNumber: 3,
      title: "Pokémon 151 Booster Bundle (6 packs)",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1614108831137-558fffac9ead?w=600&h=600&fit=crop"),
      ],
      condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
      estimatedValue: 199900,
      isWon: false,
    },
    {
      itemNumber: 4,
      title: "Pikachu V-UNION Special Collection",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1628968434441-d9c61d543a91?w=600&h=600&fit=crop"),
      ],
      condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
      estimatedValue: 299900,
      isWon: false,
    },
    {
      itemNumber: 5,
      title: "Mewtwo VSTAR Premium Collection",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=600&h=600&fit=crop"),
      ],
      condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
      estimatedValue: 249900,
      isWon: false,
    },
    {
      itemNumber: 6,
      title: "Paldean Fates 3-Pack Tin",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=600&h=600&fit=crop"),
      ],
      condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
      estimatedValue: 99900,
      isWon: false,
    },
    {
      itemNumber: 7,
      title: "Eevee Heroes Booster Box (Japanese)",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&h=600&fit=crop"),
      ],
      condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
      estimatedValue: 1999900,
      isWon: false,
    },
    {
      itemNumber: 8,
      title: "Ancient Mew Promo Card (sealed)",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&h=600&fit=crop"),
      ],
      condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
      estimatedValue: 79900,
      isWon: false,
    },
    {
      itemNumber: 9,
      title: "Pokémon Center Plush — Snorlax",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1542779283-5a86fe9aab09?w=600&h=600&fit=crop"),
      ],
      condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
      estimatedValue: 449900,
      isWon: false,
    },
    {
      itemNumber: 10,
      title: "Mystery Holo Lot — 10 cards",
      description: "10 random holographic rares from various sets.",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=600&h=600&fit=crop"),
      ],
      condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
      estimatedValue: 149900,
      isWon: false,
    },
  ];
}

function _hotWheelsPrizeItems(): PrizeDrawItem[] {
  return [
    {
      itemNumber: 1,
      title: "1969 Volkswagen Squareback STH",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&h=600&fit=crop"),
      ],
      condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
      estimatedValue: 899900,
      isWon: false,
    },
    {
      itemNumber: 2,
      title: "Datsun 510 STH (Mountain Metal)",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=600&fit=crop"),
      ],
      condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
      estimatedValue: 499900,
      isWon: false,
    },
    {
      itemNumber: 3,
      title: "Custom Mustang STH",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&h=600&fit=crop"),
      ],
      condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
      estimatedValue: 599900,
      isWon: false,
    },
    {
      itemNumber: 4,
      title: "Porsche 935 STH (Mountain Metal)",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1611821064430-0d40291922d2?w=600&h=600&fit=crop"),
      ],
      condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
      estimatedValue: 449900,
      isWon: false,
    },
    {
      itemNumber: 5,
      title: "Nissan Skyline GT-R (R32) STH",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&h=600&fit=crop"),
      ],
      condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
      estimatedValue: 699900,
      isWon: false,
    },
    {
      itemNumber: 6,
      title: "'71 Datsun Bluebird 510 Wagon STH",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1611821064430-0d40291922d2?w=600&h=600&fit=crop"),
      ],
      condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
      estimatedValue: 549900,
      isWon: false,
    },
    {
      itemNumber: 7,
      title: "Toyota AE86 Sprinter Trueno STH",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&h=600&fit=crop"),
      ],
      condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
      estimatedValue: 799900,
      isWon: false,
    },
    {
      itemNumber: 8,
      title: "Mazda RX-7 STH (FD)",
      images: [
        seedExtMedia("https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=600&fit=crop"),
      ],
      condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
      estimatedValue: 649900,
      isWon: false,
    },
  ];
}

/**
 * SB1-G Phase 4 — every prize-draw is stamped with `listingType: "prize-draw"`.
 * Mirrors the wrapper pattern used in
 * `products-standard-seed-data.ts` / `products-auctions-seed-data.ts` /
 * `products-preorders-seed-data.ts`.
 */
export const productsPrizeDrawsSeedData: Partial<ProductDocument>[] =
  _rawProductsPrizeDrawsSeedData.map((p) => ({
    ...p,
    listingType: "prize-draw" as const,
    // W1-50 — searchTokens consistent with other seeds.
    searchTokens: buildSearchTokens(
      p.title,
      p.description,
      p.brand,
      p.brandSlug,
      p.categoryNames,
      p.tags,
      p.condition,
    ),
  }));
