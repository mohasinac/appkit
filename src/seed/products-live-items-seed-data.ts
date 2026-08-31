/*
 * WHY: `listingType: "live"` requires ProductLiveItemMeta (species, age, sex, jurisdiction,
 *      CITES, vendor verification) — fields that only make sense for live animals/plants,
 *      genuinely inapplicable to this catalog's spinning-tops theme. The type was
 *      previously left as an empty stub, meaning it had ZERO permanent-catalog examples —
 *      only the disposable 7-day tester sandbox ever exercised it (see CLAUDE.md seed-data
 *      blandness sweep, 2026-08-20 session). This file adds a small set of real fixtures,
 *      explicitly off-catalog-theme, so the feature (species/jurisdiction/transport/CITES
 *      panels, the Phase 4 full-parity detail page) has permanent data to exercise —
 *      following the shape already established by the tester-sandbox's dog fixture.
 *      Deliberately kept small (3 items) since this doesn't fit the demo brand.
 * WHAT: Exports 4 live listings on Beyblade Arena — a dog, a reptile, and a plant —
 *       covering varied transport methods, vendor-verification states, and one CITES-
 *       restricted example.
 *
 *       These carried `categorySlugs: []` and a `brand: "Beyblade Arena"` string (a
 *       STORE name in a brand field, matching no brand row) until 2026-08-24, which
 *       made them unreachable from every category and brand page. Once empty tabs
 *       started hiding, that would have meant the Live Items tab never appeared
 *       anywhere at all. They now sit under the `category-living-collectibles` root
 *       added for exactly this purpose, with the `brand-independent-keepers` brand.
 *
 * EXPORTS:
 *   productsLiveItemsSeedData — Array of 4 Partial<ProductDocument> with listingType:"live"
 *
 * @tag domain:products,live-items
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
import { seedPhoto } from "./_helpers/media";

const _rawproductsLiveItemsSeedData: Partial<ProductDocument>[] = [
  {
    id: "live-golden-retriever-puppy",
    slug: "live-golden-retriever-puppy",
    title: "Golden Retriever Puppy — 6 Months, Vaccinated",
    description: "Friendly, vaccinated Golden Retriever puppy from a verified breeder. Comes with vaccination records and a starter care guide.",
    categorySlugs: ["category-dogs-retrievers","category-animals-dogs","category-companion-animals","category-living-collectibles"],
    categoryNames: ["Retrievers","Dogs","Companion Animals","Living Collectibles"],
    brand: "Independent Keepers",
    brandSlug: "brand-independent-keepers",
    price: 25000,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    isSold: false,
    mainImage: seedPhoto("live-image-golden-retriever-1-20260816", 900, 900),
    images: [
      seedPhoto("live-image-golden-retriever-1-20260816", 900, 900),
      seedPhoto("live-image-golden-retriever-2-20260816", 900, 900),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    listingType: "live" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    liveItem: {
      species: "Dog (Golden Retriever)",
      ageMonths: 6,
      sex: "male" as const,
      careInfo: "Feed twice daily with vet-recommended puppy food. Vaccination records included; next booster due at 8 months.",
      transport: { method: "in-person" as const, insuranceIncluded: false },
      jurisdictionAllowed: ["IN-MH", "IN-KA", "IN-DL"],
      vendorVerified: true,
    },
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["live-item"],
    createdAt: new Date("2026-08-16"),
    updatedAt: new Date("2026-08-16"),
    searchTxt: buildSearchTxt([
      "Golden Retriever Puppy — 6 Months, Vaccinated",
      "Friendly, vaccinated Golden Retriever puppy from a verified breeder.",
      "Beyblade Arena",
      undefined,
      [],
      ["live-item"],
    ]),
  } as unknown as Partial<ProductDocument>,
  {
    id: "live-bearded-dragon-juvenile",
    slug: "live-bearded-dragon-juvenile",
    title: "Bearded Dragon — Juvenile, Captive-Bred",
    description: "Healthy captive-bred bearded dragon, eating well on a staple diet of greens and insects. Specialist courier transport only.",
    categorySlugs: ["category-reptiles-lizards","category-animals-reptiles","category-companion-animals","category-living-collectibles"],
    categoryNames: ["Lizards","Reptiles","Companion Animals","Living Collectibles"],
    brand: "Independent Keepers",
    brandSlug: "brand-independent-keepers",
    price: 6500,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    isSold: false,
    mainImage: seedPhoto("live-image-bearded-dragon-1-20260817", 900, 900),
    images: [seedPhoto("live-image-bearded-dragon-1-20260817", 900, 900)],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    listingType: "live" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    liveItem: {
      species: "Bearded Dragon (Pogona vitticeps)",
      ageMonths: 4,
      sex: "unknown" as const,
      careInfo: "Requires a UVB-lit terrarium at 35-40°C basking zone. Staple diet: leafy greens + gut-loaded insects 3x/week.",
      transport: { method: "specialist" as const, handlingFee: 800, insuranceIncluded: true },
      jurisdictionAllowed: ["IN-MH", "IN-KA"],
      vendorVerified: false,
      cites: "CITES-II-2026-0417",
    },
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["live-item"],
    createdAt: new Date("2026-08-17"),
    updatedAt: new Date("2026-08-17"),
    searchTxt: buildSearchTxt([
      "Bearded Dragon — Juvenile, Captive-Bred",
      "Healthy captive-bred bearded dragon, specialist courier transport only.",
      "Beyblade Arena",
      undefined,
      [],
      ["live-item"],
    ]),
  } as unknown as Partial<ProductDocument>,
  {
    id: "live-bonsai-juniper-10yr",
    slug: "live-bonsai-juniper-10yr",
    title: "Juniper Bonsai — 10 Years Trained",
    description: "A 10-year trained juniper bonsai in a glazed ceramic pot. Low-maintenance, shipped by courier with root-ball protection.",
    categorySlugs: ["category-bonsai-juniper","category-plants-bonsai","category-live-plants","category-living-collectibles"],
    categoryNames: ["Juniper Bonsai","Bonsai","Live Plants","Living Collectibles"],
    brand: "Independent Keepers",
    brandSlug: "brand-independent-keepers",
    price: 3200,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    isSold: false,
    mainImage: seedPhoto("live-image-bonsai-juniper-1-20260818", 900, 900),
    images: [
      seedPhoto("live-image-bonsai-juniper-1-20260818", 900, 900),
      seedPhoto("live-image-bonsai-juniper-2-20260818", 900, 900),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    listingType: "live" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    liveItem: {
      species: "Juniper (Juniperus procumbens)",
      sex: "n/a" as const,
      careInfo: "Keep outdoors in indirect sunlight, water when topsoil is dry to the touch. Prune new growth every spring.",
      transport: { method: "courier" as const, handlingFee: 300, insuranceIncluded: false },
      jurisdictionAllowed: ["IN-MH", "IN-KA", "IN-DL", "IN-TN", "IN-TG"],
      vendorVerified: true,
    },
    customFields: [{ key: "Training Age", type: "text", value: "10 years" }],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["live-item"],
    createdAt: new Date("2026-08-18"),
    updatedAt: new Date("2026-08-18"),
    searchTxt: buildSearchTxt([
      "Juniper Bonsai — 10 Years Trained",
      "A 10-year trained juniper bonsai in a glazed ceramic pot.",
      "Beyblade Arena",
      undefined,
      [],
      ["live-item"],
    ]),
  } as unknown as Partial<ProductDocument>,
  {
    // Sold live item. Keeps species / sex / jurisdiction populated so those
    // per-type facets still have a row inside the Sold scope.
    id: "live-bonsai-juniper-5yr-sold",
    slug: "live-bonsai-juniper-5yr-sold",
    title: "Juniper Bonsai, 5 Years — Sold",
    description: "A five-year-old shimpaku juniper bonsai, already rehomed. Listing kept up for reference.",
    categorySlugs: ["category-bonsai-juniper","category-plants-bonsai","category-live-plants","category-living-collectibles"],
    categoryNames: ["Juniper Bonsai","Bonsai","Live Plants","Living Collectibles"],
    brandSlug: "brand-independent-keepers",
    brand: "Independent Keepers",
    price: 4500,
    currency: "INR",
    stockQuantity: 0,
    availableQuantity: 0,
    isSold: true,
    mainImage: seedPhoto("live-image-juniper-bonsai-sold-1-20260824", 900, 900),
    images: [
      seedPhoto("live-image-juniper-bonsai-sold-1-20260824", 900, 900),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    listingType: "live" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    liveItem: {
      species: "Juniperus chinensis Shimpaku",
      ageMonths: 60,
      careInfo: "Full sun, water when the topsoil dries, wire-trained.",
      transport: { method: "in-person" as const, insuranceIncluded: false },
      jurisdictionAllowed: ["MH", "KA", "DL"],
      vendorVerified: true,
    },
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["bonsai", "sold"],
    createdAt: new Date("2026-08-24"),
    updatedAt: new Date("2026-08-24"),
  },
];

/**
 * Every record gains `searchTxt` here rather than inline, so a fixture added at
 * the bottom of the array cannot ship without it — which is exactly how the
 * sold/depleted fixture in this file ended up unsearchable.
 */
export const productsLiveItemsSeedData: Partial<ProductDocument>[] =
  _rawproductsLiveItemsSeedData.map(withProductSearchTxt);
