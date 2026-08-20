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
 * WHAT: Exports 3 live listings on Beyblade Arena — a dog, a reptile, and a plant —
 *       covering varied transport methods, vendor-verification states, and one CITES-
 *       restricted example. No categorySlugs (the Beyblade-only category tree has no
 *       applicable leaf for live animals/plants).
 *
 * EXPORTS:
 *   productsLiveItemsSeedData — Array of 3 Partial<ProductDocument> with listingType:"live"
 *
 * @tag domain:products,live-items
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

export const productsLiveItemsSeedData: Partial<ProductDocument>[] = [
  {
    id: "live-golden-retriever-puppy",
    slug: "live-golden-retriever-puppy",
    title: "Golden Retriever Puppy — 6 Months, Vaccinated",
    description: "Friendly, vaccinated Golden Retriever puppy from a verified breeder. Comes with vaccination records and a starter care guide.",
    categorySlugs: [],
    categoryNames: [],
    brand: "Beyblade Arena",
    price: 25000,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/live-image-golden-retriever-1-20260816/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/live-image-golden-retriever-1-20260816/900/900"),
      seedExtMedia("https://picsum.photos/seed/live-image-golden-retriever-2-20260816/900/900"),
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
    searchTokens: buildSearchTokens(
      "Golden Retriever Puppy — 6 Months, Vaccinated",
      "Friendly, vaccinated Golden Retriever puppy from a verified breeder.",
      "Beyblade Arena",
      undefined,
      [],
      ["live-item"],
    ),
  } as unknown as Partial<ProductDocument>,
  {
    id: "live-bearded-dragon-juvenile",
    slug: "live-bearded-dragon-juvenile",
    title: "Bearded Dragon — Juvenile, Captive-Bred",
    description: "Healthy captive-bred bearded dragon, eating well on a staple diet of greens and insects. Specialist courier transport only.",
    categorySlugs: [],
    categoryNames: [],
    brand: "Beyblade Arena",
    price: 6500,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/live-image-bearded-dragon-1-20260817/900/900"),
    images: [seedExtMedia("https://picsum.photos/seed/live-image-bearded-dragon-1-20260817/900/900")],
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
    searchTokens: buildSearchTokens(
      "Bearded Dragon — Juvenile, Captive-Bred",
      "Healthy captive-bred bearded dragon, specialist courier transport only.",
      "Beyblade Arena",
      undefined,
      [],
      ["live-item"],
    ),
  } as unknown as Partial<ProductDocument>,
  {
    id: "live-bonsai-juniper-10yr",
    slug: "live-bonsai-juniper-10yr",
    title: "Juniper Bonsai — 10 Years Trained",
    description: "A 10-year trained juniper bonsai in a glazed ceramic pot. Low-maintenance, shipped by courier with root-ball protection.",
    categorySlugs: [],
    categoryNames: [],
    brand: "Beyblade Arena",
    price: 3200,
    currency: "INR",
    stockQuantity: 1,
    availableQuantity: 1,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/live-image-bonsai-juniper-1-20260818/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/live-image-bonsai-juniper-1-20260818/900/900"),
      seedExtMedia("https://picsum.photos/seed/live-image-bonsai-juniper-2-20260818/900/900"),
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
    searchTokens: buildSearchTokens(
      "Juniper Bonsai — 10 Years Trained",
      "A 10-year trained juniper bonsai in a glazed ceramic pot.",
      "Beyblade Arena",
      undefined,
      [],
      ["live-item"],
    ),
  } as unknown as Partial<ProductDocument>,
];
