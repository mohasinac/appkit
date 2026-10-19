/*
 * WHY: Real, wiki-verified Beyblade X listings under `store-letitrip-official` — built
 *      2026-10-19 so the production catalogue has genuinely purchasable products ahead of
 *      PhonePe merchant registration, which requires at least one real listing. Every name,
 *      product code, release date and image is sourced from beyblade.fandom.com (see
 *      docs/research/bey-corpus-2026-10/ for the corpus and image provenance) — nothing here
 *      is invented. `scripts/fetch-product-images.mjs` + `scripts/upload-product-images.mjs`
 *      are the reproducible pipeline that produced the `/media/product-*-image` references.
 *
 *      Two of five standalone tops (CobaltDrake, PhoenixWing) are documented twice in the
 *      research corpus under a slug collision and sit in its `review` bucket rather than
 *      `canonical` — NOT because they are two competing retail releases, but because the two
 *      corpus documents describing each have different completeness (one has the anime
 *      owner's name, the other has the product code). Both describe the same real product;
 *      this file uses the fuller description of each.
 *
 *      The BX-53 All-in-One Set demonstrates the PRODUCT GROUP feature (`isGroupParent` /
 *      `groupId` / `groupChildSlugs` on `ProductDocument` — see CLAUDE.md "Bundles vs
 *      Product Groups vs Grouped Listings"): one parent listing (the boxed set) plus six
 *      child listings, each independently stocked and independently purchasable. Stock is
 *      NOT pooled — selling the parent box does not decrement any child's `stockQuantity`,
 *      and vice versa. This is also the first STATIC SEED fixture of this shape in the
 *      codebase (confirmed by research — the only prior producer of `isGroupParent` is the
 *      live sticker-trace "promote sheet to listings" code path, never a seed file), so there
 *      was no existing template; cross-referenced ids were verified against the real
 *      `products.repository.ts` field contract rather than guessed.
 *
 *      Two of the group's six children reuse a LEAF CATEGORY a standalone listing in this
 *      same file already occupies (`category-aeropegasus-3-70a`, `category-x-xtreme-
 *      stadiums`) — this is correct, not a collision: the box's AeroPegasus is a "Double
 *      Metal Coat" colourway exclusive to the set, distinct from the standalone AeroPegasus
 *      (the Rare Bey Get Battle Prize Booster colourway), and the box's stadium is a "Clear
 *      Black×Green" colourway distinct from the standard-release Xtreme Stadium. Two
 *      differently-priced, differently-described, independently-stocked products sharing one
 *      taxonomy leaf is the correct way to model "same model line, different real release."
 *
 * WHAT: Exports 12 standard products with listingType:"standard" — 5 standalone (4 tops + 1
 *       stadium) and 7 forming one product group (1 parent + 6 children).
 *
 * EXPORTS:
 *   productsBeybladeXSeedData — Array of 12 standard products
 *
 * @tag domain:products,catalog
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import { seedGallery } from "./_helpers/media";
import { ProductDocument } from "../features/products/schemas/firestore";
import { PRODUCT_FIELDS } from "../constants/field-names";
import { withFinalSale } from "./_helpers/final-sale-fixtures";
import { withDerivedCategoryNames } from "./_helpers/category-names";

const STORE_ID = "store-letitrip-official";
const STORE_NAME = "LetItRip Official";
const BRAND_SLUG = "brand-takara-tomy";
const BRAND = "Takara-Tomy";

const _raw: Partial<ProductDocument>[] = [
  // ===== Standalone tops =====
  {
    id: "product-beyblade-x-aeropegasus-3-70a",
    slug: "product-beyblade-x-aeropegasus-3-70a",
    barcodeId: "LIR-BEY-X-001",
    title: "Beyblade X AeroPegasus 3-70A",
    description:
      "AeroPegasus 3-70A, an Attack-type Beyblade X top — the Rare Bey Get Battle mobile-app prize colourway, sold new in box. Previously obtainable only as a limited app reward; this is the collector-premium release, distinct from the Double Metal Coat colourway included in the BX-53 All-in-One Set (listed separately).",
    categorySlugs: ["category-aeropegasus-3-70a"],
    brandSlug: BRAND_SLUG,
    brand: BRAND,
    price: 20000,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 2,
    availableQuantity: 2,
    isSold: false,
    mainImage: "/media/product-aeropegasus-3-70a-image",
    images: seedGallery("/media/product-aeropegasus-3-70a-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    featured: true,
    tags: ["attack-type", "rare-bey", "prize-exclusive"],
    storeId: STORE_ID,
    storeName: STORE_NAME,
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
  },
  {
    id: "product-beyblade-x-valkyrievolt-s4-70v",
    slug: "product-beyblade-x-valkyrievolt-s4-70v",
    barcodeId: "LIR-BEY-X-002",
    title: "Beyblade X ValkyrieVolt S4-70V",
    description:
      "ValkyrieVolt S4-70V, a Custom Line (CX) Beyblade X top. The CX Blade splits into a Lock Chip, a Main Blade and an Assist Blade, giving one purchase several distinct build combinations. Sold new in box.",
    categorySlugs: ["category-valkyrievolt-s4-70v"],
    brandSlug: BRAND_SLUG,
    brand: BRAND,
    price: 10500,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 3,
    availableQuantity: 3,
    isSold: false,
    mainImage: "/media/product-valkyrievolt-s4-70v-image",
    images: seedGallery("/media/product-valkyrievolt-s4-70v-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    featured: true,
    tags: ["custom-line", "cx"],
    storeId: STORE_ID,
    storeName: STORE_NAME,
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
  },
  {
    id: "product-beyblade-x-cobaltdrake-4-60f",
    slug: "product-beyblade-x-cobaltdrake-4-60f",
    barcodeId: "LIR-BEY-X-003",
    title: "Beyblade X CobaltDrake 4-60F",
    description:
      "CobaltDrake 4-60F (BX-00), an Attack-type Basic Line top released as a Rare Bey Get Battle prize booster in September 2023. In the anime, piloted by Khrome Ryugu. Sold new in box.",
    categorySlugs: ["category-x-basic"],
    brandSlug: BRAND_SLUG,
    brand: BRAND,
    price: 17500,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 2,
    availableQuantity: 2,
    isSold: false,
    mainImage: "/media/product-cobaltdrake-4-60f-image",
    images: seedGallery("/media/product-cobaltdrake-4-60f-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    featured: true,
    tags: ["attack-type", "rare-bey", "prize-exclusive"],
    storeId: STORE_ID,
    storeName: STORE_NAME,
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
  },
  {
    id: "product-beyblade-x-phoenixwing-9-60gf",
    slug: "product-beyblade-x-phoenixwing-9-60gf",
    barcodeId: "LIR-BEY-X-004",
    title: "Beyblade X PhoenixWing 9-60GF",
    description:
      "PhoenixWing 9-60GF (BX-23), a Basic Line Beyblade X booster released December 2023. In the anime, the signature top of Blaze Fujiwara, designer of Yggdrasil Inc. Originally Attack-classed; later reclassified Stamina in the UX era. Sold new in box.",
    categorySlugs: ["category-x-basic"],
    brandSlug: BRAND_SLUG,
    brand: BRAND,
    price: 2500,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 6,
    availableQuantity: 6,
    isSold: false,
    mainImage: "/media/product-phoenixwing-9-60gf-image",
    images: seedGallery("/media/product-phoenixwing-9-60gf-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["booster"],
    storeId: STORE_ID,
    storeName: STORE_NAME,
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
  },

  // ===== Standalone stadium =====
  {
    id: "product-beyblade-x-xtreme-stadium-bx-10",
    slug: "product-beyblade-x-xtreme-stadium-bx-10",
    barcodeId: "LIR-BEY-X-005",
    title: "Beyblade X Xtreme Stadium (BX-10)",
    description:
      "The BX-10 Xtreme Stadium — the standard 1v1 arena for Beyblade X, released July 2023. Its raised Xtreme Line rail is what the whole X generation is tuned around: a top that reaches and holds the rail accelerates along it (the Xtreme Dash). The tournament-standard stadium for both Beyblade Battle Base (B4) and World Beyblade Organization (WBO) play. Sold new.",
    categorySlugs: ["category-x-xtreme-stadiums"],
    brandSlug: BRAND_SLUG,
    brand: BRAND,
    price: 4500,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 4,
    availableQuantity: 4,
    isSold: false,
    mainImage: "/media/product-xtreme-stadium-bx-10-image",
    images: seedGallery("/media/product-xtreme-stadium-bx-10-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    featured: true,
    tags: ["stadium", "tournament-standard"],
    storeId: STORE_ID,
    storeName: STORE_NAME,
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
  },

  // ===== BX-53 All-in-One Set — Product Group parent =====
  {
    id: "product-beyblade-x-bx-53-all-in-one-set",
    slug: "product-beyblade-x-bx-53-all-in-one-set",
    barcodeId: "LIR-BEY-X-006",
    title: "Beyblade X BX-53 All-in-One Set",
    description:
      "The BX-53 All-in-One Set — Takara Tomy's deluxe Beyblade X starter box, released October 2026 at ¥7,480. One box, three ready-to-battle tops (Attack/Stamina/Defense), two launchers and a dedicated stadium: everything needed to go from first battle to part customisation. Every item in the box is also listed individually below — pick exactly what you want, buy the complete set, or mix and match. Buying this box does not affect the stock of the individual listings, and vice versa.",
    categorySlugs: ["category-beyblade-x"],
    brandSlug: BRAND_SLUG,
    brand: BRAND,
    price: 12500,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 3,
    availableQuantity: 3,
    isSold: false,
    mainImage: "/media/product-bx-53-box-image",
    images: seedGallery("/media/product-bx-53-box-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    featured: true,
    tags: ["starter-set", "all-in-one", "deluxe"],
    storeId: STORE_ID,
    storeName: STORE_NAME,
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
    // ── Product Group (parent) ──
    groupId: "product-beyblade-x-bx-53-all-in-one-set",
    isGroupParent: true,
    groupTitle: "BX-53 All-in-One Set",
    groupChildSlugs: [
      "product-beyblade-x-bx-53-aeropegasus-dmc",
      "product-beyblade-x-bx-53-wizardarrow-v2",
      "product-beyblade-x-bx-53-knightshield-v2",
      "product-beyblade-x-bx-53-winder-launcher",
      "product-beyblade-x-bx-53-string-launcher",
      "product-beyblade-x-bx-53-xtreme-stadium-variant",
    ],
    // No groupMinMembers/groupMaxMembers/groupRequiredMemberIds/groupMaxUnitsPerMember —
    // absent means unrestricted. This is deliberately OPEN pick-and-choose: a
    // buyer may select any subset of the six children in any quantity, which
    // is the entire distinction from a Bundle (all-or-nothing, fixed price).
  },

  // ===== BX-53 All-in-One Set — Product Group children =====
  {
    id: "product-beyblade-x-bx-53-aeropegasus-dmc",
    slug: "product-beyblade-x-bx-53-aeropegasus-dmc",
    barcodeId: "LIR-BEY-X-007",
    title: "AeroPegasus 3-70A (Double Metal Coat) — BX-53 Set Component",
    description:
      "AeroPegasus 3-70A in the Double Metal Coat finish — the colourway exclusive to the BX-53 All-in-One Set, distinct from the Rare Bey Get Battle prize-app colourway (listed separately). Sold individually; buying this does not require buying the rest of the BX-53 set.",
    categorySlugs: ["category-aeropegasus-3-70a"],
    brandSlug: BRAND_SLUG,
    brand: BRAND,
    price: 7500,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 5,
    availableQuantity: 5,
    isSold: false,
    mainImage: "/media/product-bx-53-aeropegasus-dmc-image",
    images: seedGallery("/media/product-bx-53-aeropegasus-dmc-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["attack-type", "bx-53-component", "double-metal-coat"],
    storeId: STORE_ID,
    storeName: STORE_NAME,
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
    groupId: "product-beyblade-x-bx-53-all-in-one-set",
    groupParentSlug: "product-beyblade-x-bx-53-all-in-one-set",
    groupTitle: "BX-53 All-in-One Set",
  },
  {
    id: "product-beyblade-x-bx-53-wizardarrow-v2",
    slug: "product-beyblade-x-bx-53-wizardarrow-v2",
    barcodeId: "LIR-BEY-X-008",
    title: "WizardArrow 4-80B Ver.2.0 — BX-53 Set Component",
    description:
      "WizardArrow 4-80B Version 2.0, the Stamina-type top from the BX-53 All-in-One Set. The Ver.2.0 Blade is re-tuned over the original release: Attack 17 (was 15), Defense 33 (was 30), Stamina 60 (was 55). Sold individually; buying this does not require buying the rest of the BX-53 set.",
    categorySlugs: ["category-wizardarrow-4-80b"],
    brandSlug: BRAND_SLUG,
    brand: BRAND,
    price: 1500,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 8,
    availableQuantity: 8,
    isSold: false,
    mainImage: "/media/product-bx-53-wizardarrow-v2-image",
    images: seedGallery("/media/product-bx-53-wizardarrow-v2-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["stamina-type", "bx-53-component", "ver-2"],
    storeId: STORE_ID,
    storeName: STORE_NAME,
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
    groupId: "product-beyblade-x-bx-53-all-in-one-set",
    groupParentSlug: "product-beyblade-x-bx-53-all-in-one-set",
    groupTitle: "BX-53 All-in-One Set",
  },
  {
    id: "product-beyblade-x-bx-53-knightshield-v2",
    slug: "product-beyblade-x-bx-53-knightshield-v2",
    barcodeId: "LIR-BEY-X-009",
    title: "KnightShield 3-80N Ver.2.0 — BX-53 Set Component",
    description:
      "KnightShield 3-80N Version 2.0, the Defense-type top from the BX-53 All-in-One Set. The Ver.2.0 Blade improves on the original: Attack 22 (was 20), Defense 60 (was 55), Stamina 28 (was 25). Sold individually; buying this does not require buying the rest of the BX-53 set.",
    categorySlugs: ["category-knightshield-3-80n"],
    brandSlug: BRAND_SLUG,
    brand: BRAND,
    price: 1500,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 8,
    availableQuantity: 8,
    isSold: false,
    mainImage: "/media/product-bx-53-knightshield-v2-image",
    images: seedGallery("/media/product-bx-53-knightshield-v2-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["defense-type", "bx-53-component", "ver-2"],
    storeId: STORE_ID,
    storeName: STORE_NAME,
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
    groupId: "product-beyblade-x-bx-53-all-in-one-set",
    groupParentSlug: "product-beyblade-x-bx-53-all-in-one-set",
    groupTitle: "BX-53 All-in-One Set",
  },
  {
    id: "product-beyblade-x-bx-53-winder-launcher",
    slug: "product-beyblade-x-bx-53-winder-launcher",
    barcodeId: "LIR-BEY-X-010",
    title: "Winder Launcher — BX-53 Set Component",
    description:
      "The right-spin Winder Launcher from the BX-53 All-in-One Set — uses a rigid, notched plastic ripcord that threads into an internal gear and is pulled straight out via the ringed handle. Sold individually; buying this does not require buying the rest of the BX-53 set.",
    categorySlugs: ["category-x-winders"],
    brandSlug: BRAND_SLUG,
    brand: BRAND,
    price: 250,
    allowOffers: false,
    currency: "INR",
    stockQuantity: 15,
    availableQuantity: 15,
    isSold: false,
    mainImage: "/media/product-bx-53-winder-launcher-image",
    images: seedGallery("/media/product-bx-53-winder-launcher-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["launcher", "bx-53-component"],
    storeId: STORE_ID,
    storeName: STORE_NAME,
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
    groupId: "product-beyblade-x-bx-53-all-in-one-set",
    groupParentSlug: "product-beyblade-x-bx-53-all-in-one-set",
    groupTitle: "BX-53 All-in-One Set",
  },
  {
    id: "product-beyblade-x-bx-53-string-launcher",
    slug: "product-beyblade-x-bx-53-string-launcher",
    barcodeId: "LIR-BEY-X-011",
    title: "String Launcher — BX-53 Set Component",
    description:
      "The String Launcher from the BX-53 All-in-One Set — the only Beyblade X launcher type with no ripcord, using a string built into the unit itself: load the top, pull the string, launch. Shown here as packaged inside the BX-53 box (no separate studio photo exists for this launcher on its own). Sold individually; buying this does not require buying the rest of the BX-53 set.",
    categorySlugs: ["category-x-string-launchers"],
    brandSlug: BRAND_SLUG,
    brand: BRAND,
    price: 250,
    allowOffers: false,
    currency: "INR",
    stockQuantity: 15,
    availableQuantity: 15,
    isSold: false,
    mainImage: "/media/product-bx-53-string-launcher-image",
    images: seedGallery("/media/product-bx-53-string-launcher-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["launcher", "bx-53-component"],
    storeId: STORE_ID,
    storeName: STORE_NAME,
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
    groupId: "product-beyblade-x-bx-53-all-in-one-set",
    groupParentSlug: "product-beyblade-x-bx-53-all-in-one-set",
    groupTitle: "BX-53 All-in-One Set",
  },
  {
    id: "product-beyblade-x-bx-53-xtreme-stadium-variant",
    slug: "product-beyblade-x-bx-53-xtreme-stadium-variant",
    barcodeId: "LIR-BEY-X-012",
    title: "Xtreme Stadium — Clear Black×Green (BX-53 Set Component)",
    description:
      "The Clear Black×Green Xtreme Stadium colourway included in the BX-53 All-in-One Set — the same Xtreme Line rail as the standard-release Xtreme Stadium (listed separately), in a colourway exclusive to this box. Sold individually; buying this does not require buying the rest of the BX-53 set.",
    categorySlugs: ["category-x-xtreme-stadiums"],
    brandSlug: BRAND_SLUG,
    brand: BRAND,
    price: 3500,
    allowOffers: true,
    minOfferPercent: 70,
    currency: "INR",
    stockQuantity: 5,
    availableQuantity: 5,
    isSold: false,
    mainImage: "/media/product-bx-53-xtreme-stadium-image",
    images: seedGallery("/media/product-bx-53-xtreme-stadium-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["stadium", "bx-53-component", "colourway-variant"],
    storeId: STORE_ID,
    storeName: STORE_NAME,
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
    groupId: "product-beyblade-x-bx-53-all-in-one-set",
    groupParentSlug: "product-beyblade-x-bx-53-all-in-one-set",
    groupTitle: "BX-53 All-in-One Set",
  },
];

/*
 * 🛑 `listingType` applied AFTER the array literal's closing `]`, inside the
 * `.map()` — never spliced onto a spread. CLAUDE.md's J13 documents this
 * exact bug surviving its own fix once already in this codebase.
 */
export const productsBeybladeXSeedData: Partial<ProductDocument>[] = _raw
  .map((p) => ({
    ...p,
    listingType: PRODUCT_FIELDS.LISTING_TYPE_VALUES.STANDARD,
    /*
     * 🛑 `permanent`, explicitly — the `products` collection defaults to
     * `test` (SEED_COLLECTION_PURPOSE), and that default is correct for the
     * curated demo fixtures it was written for. It is WRONG for these.
     *
     * `appkit-seed purge` deletes every document resolving `test` and nothing
     * else. Left on the default, this entire real catalogue — the only
     * genuinely purchasable listings on the site, built for PhonePe merchant
     * registration — would be destroyed by the next routine purge, silently
     * and with no way to tell it apart from clearing mock data.
     *
     * Set inline (resolution step 1) rather than as `SEED_ROW_PURPOSE`
     * entries (step 2): an external id list is a hand-maintained mirror that
     * drifts the moment a row is added or renamed here (Root Cause #42),
     * whereas this cannot go out of sync with the rows it describes.
     */
    seedPurpose: "permanent" as const,
  }))
  .map(withFinalSale)
  .map(withDerivedCategoryNames);
