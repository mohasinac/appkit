/*
 * WHY: Seeds a Beyblade classifieds catalog with real geographic and meta-field variety.
 *      The original 1-fixture file only ever exercised one city (Mumbai) and always
 *      `acceptsShipping:false`/`negotiable:true` — no variety to exercise the
 *      classifieds filter UI (see CLAUDE.md seed-data blandness sweep, 2026-08-20).
 * WHAT: Exports 8 classified listings on Beyblade Arena — local meetups across 5 Indian
 *       cities, covering both true/false states of acceptsShipping/negotiable.
 *
 *       🛑 The `allowOffers` split is the point of this file now. A classified has
 *       no cart, so the offer IS the purchase path: the 4 fixtures WITH
 *       `allowOffers: true` exercise the negotiate flow (floor at
 *       `minOfferPercent`), and the 4 WITHOUT it exercise the request-to-buy
 *       flow (amount pinned to the asking price). Keep both sets populated —
 *       drop either and half of `resolveOfferBounds` becomes untestable by hand.
 *       A `contactMethod` field was removed 2026-08-31; see ProductClassifiedMeta.
 *
 * EXPORTS:
 *   productsClassifiedsSeedData — Array of 8 Partial<ProductDocument> with listingType:"classified"
 *
 * @tag domain:products,classifieds
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import { ProductDocument } from "../features/products/schemas/firestore";
import { withProductSearchTxt } from "./_helpers/product-search-txt";
import { PRODUCT_FIELDS } from "../constants/field-names";
import { buildSearchTxt } from "../utils/search-txt";
import { seedExtMedia } from "./_helpers/media";

const _rawproductsClassifiedsSeedData: Partial<ProductDocument>[] = [
  {
    id: "classified-beyblade-stadium-set",
    slug: "classified-beyblade-stadium-set",
    title: "Used Beyblade Stadium Set — Local Pickup Only",
    description: "Well-loved Beyblade stadium with 6 tops and 2 launchers, sold as-is. Meet up locally — price is negotiable.",
    categorySlugs: ["category-storage-cases","category-gear-storage","category-battle-gear","category-spinning-tops"],
    categoryNames: ["Cases & Trays","Storage & Care","Battle Gear","Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 1200,
    // Matches `classified.negotiable: true` below — that flag is the
    // DISPLAY hint ("₹650 (negotiable)"), this one is what actually
    // turns the Make-an-Offer form on. The three non-negotiable
    // classifieds deliberately leave both off.
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-stadium-set-1-20260101/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-stadium-set-1-20260101/900/900"),
      seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-stadium-set-2-20260101/900/900"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    listingType: "classified" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    classified: {
      meetupArea: { city: "Mumbai", locality: "Andheri West", pincode: "400058" },
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
    searchTxt: buildSearchTxt([
      "Used Beyblade Stadium Set — Local Pickup Only",
      "Well-loved Beyblade stadium with 6 tops and 2 launchers.",
      "Beyblade",
      "brand-beyblade",
      ["Spinning Tops"],
      ["classified", "local-pickup"],
    ]),
  } as unknown as Partial<ProductDocument>,
  {
    id: "classified-beyblade-burst-collection-bengaluru",
    slug: "classified-beyblade-burst-collection-bengaluru",
    title: "Beyblade Burst Collection (12 Tops) — Bengaluru",
    description: "Downsizing my Burst collection — 12 tops in good condition, fixed price, will also ship nationwide if you'd rather not meet up.",
    categorySlugs: ["category-burst-cho-z","category-burst-tops","category-beyblade-burst","category-spinning-tops"],
    categoryNames: ["Cho-Z","Burst Tops","Beyblade Burst","Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 4500,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-burst-bengaluru-1-20260813/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-burst-bengaluru-1-20260813/900/900"),
      seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-burst-bengaluru-2-20260813/900/900"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.GOOD,
    listingType: "classified" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    classified: {
      meetupArea: { city: "Bengaluru", locality: "Koramangala", pincode: "560034" },
      acceptsShipping: true,
      negotiable: false,
    },
    customFields: [{ key: "Item Count", type: "number", value: "12" }],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["classified", "bulk-lot"],
    createdAt: new Date("2026-08-13"),
    updatedAt: new Date("2026-08-13"),
    searchTxt: buildSearchTxt([
      "Beyblade Burst Collection (12 Tops) — Bengaluru",
      "Downsizing my Burst collection, fixed price, ships nationwide.",
      "Beyblade",
      "brand-beyblade",
      ["Beyblade Burst", "Spinning Tops"],
      ["classified", "bulk-lot"],
    ]),
  } as unknown as Partial<ProductDocument>,
  {
    id: "classified-beyblade-x-starter-pune",
    slug: "classified-beyblade-x-starter-pune",
    title: "Beyblade X Starter Pack — Pune, Phone Contact Only",
    description: "Barely used Beyblade X starter pack, selling because I upgraded to a full set. Call or WhatsApp only, no chat.",
    categorySlugs: ["category-x-boosters","category-x-tops","category-beyblade-x","category-spinning-tops"],
    categoryNames: ["Boosters","Beyblade X Tops","Beyblade X","Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    price: 650,
    // Matches `classified.negotiable: true` below — that flag is the
    // DISPLAY hint ("₹650 (negotiable)"), this one is what actually
    // turns the Make-an-Offer form on. The three non-negotiable
    // classifieds deliberately leave both off.
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-x-pune-1-20260814/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-x-pune-1-20260814/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.LIKE_NEW,
    listingType: "classified" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    classified: {
      meetupArea: { city: "Pune", locality: "Kothrud", pincode: "411038" },
      acceptsShipping: false,
      negotiable: true,
    },
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["classified", "local-pickup", "starter-set"],
    createdAt: new Date("2026-08-14"),
    updatedAt: new Date("2026-08-14"),
    searchTxt: buildSearchTxt([
      "Beyblade X Starter Pack — Pune, Phone Contact Only",
      "Barely used Beyblade X starter pack, phone/WhatsApp only.",
      "Takara-Tomy",
      "brand-takara-tomy",
      ["Beyblade X", "Spinning Tops"],
      ["classified", "local-pickup", "starter-set"],
    ]),
  } as unknown as Partial<ProductDocument>,
  {
    id: "classified-beyblade-metal-vintage-delhi",
    slug: "classified-beyblade-metal-vintage-delhi",
    title: "Vintage Metal Fight Lot (5 Tops) — Delhi NCR",
    description: "A well-preserved 5-top Metal Fight lot from a long-time collector. Firm price, ships anywhere in India.",
    categorySlugs: ["category-metal-fusion","category-metal-tops","category-beyblade-metal","category-spinning-tops"],
    categoryNames: ["Metal Fusion","Metal Fight Tops","Beyblade Metal Fight","Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    price: 3200,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-metal-delhi-1-20260815/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-metal-delhi-1-20260815/900/900"),
      seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-metal-delhi-2-20260815/900/900"),
      seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-metal-delhi-3-20260815/900/900"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.GOOD,
    listingType: "classified" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    classified: {
      meetupArea: { city: "New Delhi", locality: "Rajouri Garden", pincode: "110027" },
      acceptsShipping: true,
      negotiable: false,
    },
    customFields: [{ key: "Item Count", type: "number", value: "5" }],
    customSections: [
      {
        id: "collector-notes",
        title: "Collector's Notes",
        text: "All 5 tops have been kept in a display case since purchase — minor shelf wear only, no chips or cracks on any layer/energy ring.",
      },
    ],
    featured: true,
    isPromoted: false,
    isOnSale: false,
    tags: ["classified", "bulk-lot", "vintage-collectible"],
    createdAt: new Date("2026-08-15"),
    updatedAt: new Date("2026-08-16"),
    searchTxt: buildSearchTxt([
      "Vintage Metal Fight Lot (5 Tops) — Delhi NCR",
      "Well-preserved 5-top Metal Fight lot, firm price, ships anywhere.",
      "Takara-Tomy",
      "brand-takara-tomy",
      ["Beyblade Metal Fight", "Spinning Tops"],
      ["classified", "bulk-lot", "vintage-collectible"],
    ]),
  } as unknown as Partial<ProductDocument>,
  {
    id: "classified-beyblade-original-grail-chennai",
    slug: "classified-beyblade-original-grail-chennai",
    title: "Original Series Grail Piece — Chennai, Meet Up Only",
    description: "A genuine original-series grail piece, only selling to a local buyer I can meet in person to verify authenticity together.",
    categorySlugs: ["category-original-plastic-gen","category-original-tops","category-beyblade-original","category-spinning-tops"],
    categoryNames: ["Plastic Generation","Original Tops","Beyblade Original","Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 8000,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-original-chennai-1-20260816/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-original-chennai-1-20260816/900/900"),
      seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-original-chennai-2-20260816/900/900"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.LIKE_NEW,
    listingType: "classified" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    classified: {
      meetupArea: { city: "Chennai", locality: "T. Nagar", pincode: "600017" },
      acceptsShipping: false,
      negotiable: false,
    },
    customFields: [{ key: "Authenticity Verified", type: "boolean", value: "true" }],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["classified", "vintage-collectible", "local-pickup"],
    createdAt: new Date("2026-08-16"),
    updatedAt: new Date("2026-08-16"),
    searchTxt: buildSearchTxt([
      "Original Series Grail Piece — Chennai, Meet Up Only",
      "Genuine original-series grail piece, local meetup verification only.",
      "Beyblade",
      "brand-beyblade",
      ["Beyblade Original", "Spinning Tops"],
      ["classified", "vintage-collectible", "local-pickup"],
    ]),
  } as unknown as Partial<ProductDocument>,
  {
    id: "classified-beyblade-x-tournament-kit-hyderabad",
    slug: "classified-beyblade-x-tournament-kit-hyderabad",
    title: "Tournament-Ready Beyblade X Kit — Hyderabad",
    description: "Complete tournament-legal kit including 3 tops, stadium, and a scorecard pad from our last local meetup event.",
    categorySlugs: ["category-x-starters","category-x-tops","category-beyblade-x","category-spinning-tops"],
    categoryNames: ["Starter Sets","Beyblade X Tops","Beyblade X","Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    price: 2400,
    // Matches `classified.negotiable: true` below — that flag is the
    // DISPLAY hint ("₹650 (negotiable)"), this one is what actually
    // turns the Make-an-Offer form on. The three non-negotiable
    // classifieds deliberately leave both off.
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-x-hyderabad-1-20260817/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-x-hyderabad-1-20260817/900/900"),
      seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-x-hyderabad-2-20260817/900/900"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.GOOD,
    listingType: "classified" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    classified: {
      meetupArea: { city: "Hyderabad", locality: "Banjara Hills", pincode: "500034" },
      acceptsShipping: true,
      negotiable: true,
    },
    customFields: [{ key: "Tournament Legal", type: "boolean", value: "true" }],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["classified", "tournament-grade"],
    createdAt: new Date("2026-08-17"),
    updatedAt: new Date("2026-08-17"),
    searchTxt: buildSearchTxt([
      "Tournament-Ready Beyblade X Kit — Hyderabad",
      "Complete tournament-legal kit including stadium and scorecard pad.",
      "Takara-Tomy",
      "brand-takara-tomy",
      ["Beyblade X", "Spinning Tops"],
      ["classified", "tournament-grade"],
    ]),
  } as unknown as Partial<ProductDocument>,
  {
    id: "classified-beyblade-burst-parts-mumbai",
    slug: "classified-beyblade-burst-parts-mumbai",
    title: "Spare Burst Parts Bundle — Mumbai, Ships Too",
    description: "Assorted spare Burst layers, discs, and drivers cleared out from my parts box. Happy to meet locally or ship.",
    categorySlugs: ["category-burst-superking","category-burst-tops","category-beyblade-burst","category-spinning-tops"],
    categoryNames: ["Superking","Burst Tops","Beyblade Burst","Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 450,
    // Matches `classified.negotiable: true` below — that flag is the
    // DISPLAY hint ("₹650 (negotiable)"), this one is what actually
    // turns the Make-an-Offer form on. The three non-negotiable
    // classifieds deliberately leave both off.
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-burst-mumbai-1-20260818/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/classified-image-beyblade-burst-mumbai-1-20260818/900/900")],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    listingType: "classified" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    classified: {
      meetupArea: { city: "Mumbai", locality: "Powai", pincode: "400076" },
      acceptsShipping: true,
      negotiable: true,
    },
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["classified", "spare-parts"],
    createdAt: new Date("2026-08-18"),
    updatedAt: new Date("2026-08-18"),
    searchTxt: buildSearchTxt([
      "Spare Burst Parts Bundle — Mumbai, Ships Too",
      "Assorted spare Burst layers, discs, and drivers.",
      "Beyblade",
      "brand-beyblade",
      ["Beyblade Burst", "Spinning Tops"],
      ["classified", "spare-parts"],
    ]),
  } as unknown as Partial<ProductDocument>,
  {
    // Sold classified. Keeps `meetupArea.city` populated so the City facet
    // still has a row to match inside the Sold scope.
    id: "classified-beyblade-metal-galaxy-pegasus-sold-mumbai",
    slug: "classified-beyblade-metal-galaxy-pegasus-sold-mumbai",
    title: "Galaxy Pegasus W105R2F — Sold (Mumbai)",
    description: "Vintage Metal Fight Galaxy Pegasus, sold to a local collector. Listing kept up for reference.",
    categorySlugs: ["category-metal-masters","category-metal-tops","category-beyblade-metal","category-spinning-tops"],
    categoryNames: ["Metal Masters","Metal Fight Tops","Beyblade Metal Fight","Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 2200,
    currency: "INR",
    stockQuantity: 0,
    availableQuantity: 0,
    isSold: true,
    mainImage: seedExtMedia("https://picsum.photos/seed/classified-image-galaxy-pegasus-sold-1-20260824/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/classified-image-galaxy-pegasus-sold-1-20260824/900/900"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    listingType: "classified" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    classified: {
      meetupArea: { city: "Mumbai", locality: "Dadar", pincode: "400014" },
      acceptsShipping: false,
      negotiable: false,
    },
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["vintage", "sold"],
    createdAt: new Date("2026-08-24"),
    updatedAt: new Date("2026-08-24"),
  },
];

/**
 * Every record gains `searchTxt` here rather than inline, so a fixture added at
 * the bottom of the array cannot ship without it — which is exactly how the
 * sold/depleted fixture in this file ended up unsearchable.
 */
export const productsClassifiedsSeedData: Partial<ProductDocument>[] =
  _rawproductsClassifiedsSeedData.map(withProductSearchTxt);
