/**
 * Live-Item Products Seed Data — Yu-Gi-Oh! Themed Aquatics (SB-UNI-K)
 *
 * Stored as ProductDocument with listingType: "live". These items require
 * vendor verification and jurisdiction checks at add-to-cart.
 *
 * Theme: Collectible aquatic species named/themed after Yu-Gi-Oh! monsters.
 * (The marketplace supports live animals/plants alongside cards.)
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
    ),
  };
}

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const _rawLiveItemsSeedData: Partial<ProductDocument>[] = [
  {
    id: "live-blue-eyes-koi-albino",
    slug: "live-blue-eyes-koi-albino",
    title: "\"Blue-Eyes\" Platinum Ogon Koi — 18 cm, 8 months",
    description:
      "Stunning platinum ogon koi named after the legendary Blue-Eyes White Dragon. Bright white body with a faint blue sheen under sunlight. Healthy, eats pellets eagerly. Certified disease-free by Aqua Vet India. Specialist courier with oxygen bag + heat pack.",
    categorySlugs: ["category-live-aquatics"],
    categoryNames: ["Live Aquatics"],
    brand: undefined,
    brandSlug: undefined,
    price: 850000,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    mainImage: "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800&h=800&fit=crop",
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    tags: ["koi", "live", "aquatics", "blue-eyes", "platinum-ogon", "certified"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    liveItem: {
      species: "Cyprinus rubrofuscus (Platinum Ogon variety)",
      ageMonths: 8,
      sex: "unknown",
      careInfo:
        "Requires pond or 500+ litre tank. pH 7.0–8.0, temp 15–25°C. Feed high-protein koi pellets 2× daily. Weekly 20% water changes.",
      transport: {
        method: "specialist",
        handlingFeeInPaise: 50000,
        insuranceIncluded: true,
      },
      jurisdictionAllowed: ["IN-MH", "IN-KA", "IN-TN", "IN-KL", "IN-AP", "IN-TG", "IN-GA", "IN-GJ", "IN-DL"],
      vendorVerified: true,
    },
    shippingInfo: "Specialist live-fish courier. 24-hour delivery guarantee within allowed states. DOA refund policy applies.",
    allowOffers: false,
    createdAt: daysAgo(6),
    updatedAt: daysAgo(2),
  },
  {
    id: "live-red-eyes-betta-halfmoon",
    slug: "live-red-eyes-betta-halfmoon",
    title: "\"Red-Eyes\" Black Halfmoon Betta — Male, 5 months",
    description:
      "Deep black halfmoon betta with red eye flash — our Red-Eyes Black Dragon homage. Flares beautifully, perfect finnage spread >180°. Bred in-house, never medicated. Ships in insulated box with breather bag.",
    categorySlugs: ["category-live-aquatics"],
    categoryNames: ["Live Aquatics"],
    brand: undefined,
    brandSlug: undefined,
    price: 120000,
    currency: "INR",
    stockQuantity: 3,
    availableQuantity: 3,
    mainImage: "https://images.unsplash.com/photo-1520302519878-3c0a981b76e1?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1520302519878-3c0a981b76e1?w=800&h=800&fit=crop",
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    tags: ["betta", "live", "aquatics", "red-eyes", "halfmoon", "male"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    liveItem: {
      species: "Betta splendens (Black Halfmoon variety)",
      ageMonths: 5,
      sex: "male",
      careInfo:
        "Solo housing required — males are aggressive. Min 10 litre heated tank (26–28°C). Feed betta pellets + occasional bloodworms.",
      transport: {
        method: "courier",
        handlingFeeInPaise: 15000,
        insuranceIncluded: true,
      },
      jurisdictionAllowed: ["IN-MH", "IN-KA", "IN-TN", "IN-KL", "IN-AP", "IN-TG", "IN-GA", "IN-GJ", "IN-DL", "IN-RJ", "IN-UP", "IN-WB"],
      vendorVerified: true,
    },
    shippingInfo: "Express courier with insulated packaging. 48-hour delivery. Full refund on DOA with photo proof.",
    allowOffers: false,
    createdAt: daysAgo(4),
    updatedAt: daysAgo(1),
  },
  {
    id: "live-kuriboh-pom-pom-crab",
    slug: "live-kuriboh-pom-pom-crab",
    title: "\"Kuriboh\" Pom Pom Crab — Freshwater, captive-bred",
    description:
      "Adorable freshwater pom pom crab that looks just like Kuriboh! Carries tiny anemone-like growths on its claws. Peaceful community tank species. Captive-bred, quarantined 14 days.",
    categorySlugs: ["category-live-aquatics"],
    categoryNames: ["Live Aquatics"],
    brand: undefined,
    brandSlug: undefined,
    price: 45000,
    currency: "INR",
    stockQuantity: 8,
    availableQuantity: 8,
    mainImage: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=800&fit=crop",
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-kaiba-corp-cards",
    storeName: "Kaiba Corp Card Vault",
    tags: ["crab", "live", "aquatics", "kuriboh", "pom-pom", "freshwater"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    liveItem: {
      species: "Ptychognathus barbatus (Pom Pom Crab)",
      ageMonths: 3,
      sex: "unknown",
      careInfo:
        "Freshwater, fully aquatic. Min 20 litre tank with hiding spots. Temp 22–26°C, pH 7.0–7.5. Feed sinking pellets + blanched veg.",
      transport: {
        method: "courier",
        handlingFeeInPaise: 10000,
        insuranceIncluded: false,
      },
      jurisdictionAllowed: ["IN-MH", "IN-KA", "IN-TN", "IN-KL", "IN-AP", "IN-TG", "IN-DL", "IN-GJ"],
      vendorVerified: true,
    },
    shippingInfo: "Standard courier with damp moss packaging. Ships Mon–Wed only for safe delivery.",
    allowOffers: false,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
  },
  {
    id: "live-dark-magician-axolotl-melanoid",
    slug: "live-dark-magician-axolotl-melanoid",
    title: "\"Dark Magician\" Melanoid Axolotl — 12 cm, 6 months",
    description:
      "Deep purple-black melanoid axolotl — our Dark Magician tribute. Healthy, eating bloodworms and pellets. Captive-bred, CITES-exempt (Ambystoma mexicanum is Appendix II but captive-bred stock is exempt under Indian regulations).",
    categorySlugs: ["category-live-aquatics"],
    categoryNames: ["Live Aquatics"],
    brand: undefined,
    brandSlug: undefined,
    price: 350000,
    currency: "INR",
    stockQuantity: 2,
    availableQuantity: 2,
    mainImage: "https://images.unsplash.com/photo-1585095595205-e68428a9e205?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1585095595205-e68428a9e205?w=800&h=800&fit=crop",
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    tags: ["axolotl", "live", "aquatics", "dark-magician", "melanoid", "captive-bred"],
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    liveItem: {
      species: "Ambystoma mexicanum (Melanoid morph)",
      ageMonths: 6,
      sex: "unknown",
      careInfo:
        "Cool water species — temp 16–20°C (chiller required in most Indian cities). Min 75 litre tank, no gravel substrate. Feed earthworms, bloodworms, pellets.",
      transport: {
        method: "specialist",
        handlingFeeInPaise: 30000,
        insuranceIncluded: true,
      },
      jurisdictionAllowed: ["IN-MH", "IN-KA", "IN-TN", "IN-KL", "IN-DL"],
      vendorVerified: true,
      cites: "CB-AX-2026-0042",
    },
    shippingInfo: "Specialist cold-chain courier with ice packs. 24-hour delivery only. DOA + 48-hour health guarantee.",
    allowOffers: false,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  },
];

export const productsLiveItemsSeedData: Partial<ProductDocument>[] =
  _rawLiveItemsSeedData.map((p) => withTokens({
    ...p,
    listingType: "live" as const,
  }));
