/*
 * WHY: `listingType: "spares"` is the user's own case, in their words — *"if I
 *      have a spare attack ring for Galeon I can sell it to someone who wants
 *      it in the same colour, instead of wasting time with it."* A spare is one
 *      physical component off a disassembled top, usually quantity 1, priced by
 *      condition and colourway rather than by a catalogue number.
 * WHAT: Six spares on Beyblade Arena, one per part classification that has a
 *       real glossary row and a real cover image, spanning three generations.
 *
 * 🛑 Each one links to a REAL `partGlossary` id and files under the REAL
 * generated part leaf. Both were verified against the committed seed rather
 * than composed by hand:
 *
 *   node -e '…/"id": "(attack-ring--[a-z0-9-]+)"/…'   → the glossary rows
 *   grep partGlossaryId products-catalogue-seed-data  → the category chains
 *
 * A fabricated id here would be invisible: `partGlossaryId` is optional by
 * design (the glossary holds 752 rows and does not cover every component ever
 * moulded), so a wrong value does not error — the glossary cross-sell simply
 * never matches, which reads as "no spares listed" rather than as a bad link.
 *
 * 🛑 `mainImage` points at the part leaf's OWN cover, which exists because the
 * taxonomy-image pipeline uploaded it — `/media/<shortId>` resolves through
 * `mediaAssets/{slug}` → `storagePath`, so a slug with no row is a silent 404
 * that renders as an ordinary broken image (the 2026-10-17 incident where 504
 * covers were missing). Five of the six were CHECKED present in
 * `media-assets-seed-data.ts`; the sixth part (`spin-gear--right-sg`) has no
 * uploaded cover, so it is not in this file at all rather than carrying a slug
 * that 404s.
 *
 * EXPORTS:
 *   productsSparesSeedData — 6 Partial<ProductDocument> with listingType:"spares"
 *
 * @tag domain:products,spares
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/manifest.ts
 * @tag sideEffects:none
 */

import { seedGallery } from "./_helpers/media";
import { editorialImage } from "./_helpers/editorial-media";
import { ProductDocument } from "../features/products/schemas/firestore";
import { PRODUCT_FIELDS } from "../constants/field-names";
import { buildSearchTxt } from "../utils/search-txt";
import { withFinalSale } from "./_helpers/final-sale-fixtures";
import { withDerivedCategoryNames } from "./_helpers/category-names";

const _rawProductsSparesSeedData: Partial<ProductDocument>[] = [
  {
    id: "spare-cross-dranzer-attack-ring-red",
    slug: "spare-cross-dranzer-attack-ring-red",
    title: "Cross Dranzer Attack Ring — red, Dranzer V2 pull",
    description:
      "A loose Cross Dranzer attack ring pulled from a Dranzer V2. Red, with the usual contact-point scuffing on two of the four blades and no cracks. Fits any Plastic-Generation combo that takes a standard attack ring.",
    categorySlugs: [
      "category-cross-dranzer",
      "category-original-attack-rings",
      "category-original-parts",
      "category-beyblade-original",
      "category-spinning-tops",
    ],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 320,
    currency: "INR",
    gstRate: 5,
    hsnCode: "95030020",
    // Quantity 1 is the NORMAL case for this type, not an edge case: it is one
    // object the seller happens to have. A spare at quantity 12 is the unusual
    // row, which is why `-sg-metal-ball-base` below exists.
    stockQuantity: 1,
    availableQuantity: 1,
    isSold: false,
    mainImage: "/media/category-cross-dranzer-image",
    images: seedGallery("/media/category-cross-dranzer-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    listingType: "spares" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    partGlossaryId: "attack-ring--cross-dranzer",
    colourway: "Red",
    unitLabel: "Dranzer V2 pull",
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["spares", "attack-ring", "plastic-gen"],
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
    searchTxt: buildSearchTxt([
      "Cross Dranzer Attack Ring — red, Dranzer V2 pull",
      "A loose Cross Dranzer attack ring pulled from a Dranzer V2.",
      "Beyblade",
      "brand-beyblade",
      ["Cross Dranzer", "Attack Rings", "Original Parts"],
      ["spares", "attack-ring", "plastic-gen"],
    ]),
  } as unknown as Partial<ProductDocument>,
  {
    id: "spare-bit-chip-galeon-gold",
    slug: "spare-bit-chip-galeon-gold",
    title: "Galeon Bit Chip — gold foil",
    description:
      "The Galeon bit chip in gold foil, lifted cleanly from a spare attack ring. Foil is intact with no lift at the edges. This is the exact case this listing type exists for — a single chip somebody rebuilding a Galeon needs in this colour.",
    categorySlugs: [
      "category-bit-chip-galeon",
      "category-original-bit-chips",
      "category-original-parts",
      "category-beyblade-original",
      "category-spinning-tops",
    ],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 180,
    currency: "INR",
    gstRate: 5,
    hsnCode: "95030020",
    stockQuantity: 1,
    availableQuantity: 1,
    isSold: false,
    mainImage: "/media/category-bit-chip-galeon-image",
    images: seedGallery("/media/category-bit-chip-galeon-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.LIKE_NEW,
    listingType: "spares" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    partGlossaryId: "bit-chip--galeon",
    colourway: "Gold foil",
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["spares", "bit-chip", "plastic-gen"],
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
    searchTxt: buildSearchTxt([
      "Galeon Bit Chip — gold foil",
      "The Galeon bit chip in gold foil, lifted cleanly from a spare attack ring.",
      "Beyblade",
      "brand-beyblade",
      ["Galeon", "Bit Chips", "Original Parts"],
      ["spares", "bit-chip", "plastic-gen"],
    ]),
  } as unknown as Partial<ProductDocument>,
  {
    id: "spare-eight-heavy-weight-disk-lot",
    slug: "spare-eight-heavy-weight-disk-lot",
    title: "Eight Heavy Weight Disk — pick one of four",
    description:
      "Four Eight Heavy weight disks from a parts drawer, all original Takara. Surface oxidation varies between them and is shown in the photos; none is bent. Sold individually — the quantity is how many are left.",
    categorySlugs: [
      "category-eight-heavy",
      "category-original-weight-disks",
      "category-original-parts",
      "category-beyblade-original",
      "category-spinning-tops",
    ],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 140,
    currency: "INR",
    gstRate: 5,
    hsnCode: "95030020",
    /*
     * The counter-example to quantity 1: a seller who stripped several tops has
     * four interchangeable disks and does not want four listings. Worth seeding
     * because every stock-path test (cart cap, decrement, sell-out) needs a
     * spare with room above 1 to exercise it at all.
     */
    stockQuantity: 4,
    availableQuantity: 4,
    isSold: false,
    mainImage: "/media/category-eight-heavy-image",
    images: seedGallery("/media/category-eight-heavy-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    listingType: "spares" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    partGlossaryId: "weight-disk--eight-heavy",
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["spares", "weight-disk", "plastic-gen"],
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
    searchTxt: buildSearchTxt([
      "Eight Heavy Weight Disk — pick one of four",
      "Four Eight Heavy weight disks from a parts drawer, all original Takara.",
      "Beyblade",
      "brand-beyblade",
      ["Eight Heavy", "Weight Disks", "Original Parts"],
      ["spares", "weight-disk", "plastic-gen"],
    ]),
  } as unknown as Partial<ProductDocument>,
  {
    id: "spare-final-drive-performance-tip",
    slug: "spare-final-drive-performance-tip",
    title: "4D Bottom: Final Drive (F:D) — spare tip",
    description:
      "A spare F:D performance tip off a Big Bang Pegasis. The free-spinning mode still engages cleanly and the rubber flat is worn but not flattened. Metal Fight 4D fitment only.",
    categorySlugs: [
      "category-f-d",
      "category-metal-performance-tips",
      "category-metal-parts",
      "category-beyblade-metal",
      "category-spinning-tops",
    ],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 450,
    currency: "INR",
    gstRate: 5,
    hsnCode: "95030020",
    stockQuantity: 1,
    availableQuantity: 1,
    isSold: false,
    mainImage: "/media/category-f-d-image",
    images: seedGallery("/media/category-f-d-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    listingType: "spares" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    partGlossaryId: "performance-tip--f-d",
    unitLabel: "Big Bang Pegasis pull",
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["spares", "performance-tip", "metal-fight"],
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
    searchTxt: buildSearchTxt([
      "4D Bottom: Final Drive (F:D) — spare tip",
      "A spare F:D performance tip off a Big Bang Pegasis.",
      "Beyblade",
      "brand-beyblade",
      ["4D Bottom: Final Drive", "Performance Tips", "Metal Fight Parts"],
      ["spares", "performance-tip", "metal-fight"],
    ]),
  } as unknown as Partial<ProductDocument>,
  {
    id: "spare-atomic-driver-burst",
    slug: "spare-atomic-driver-burst",
    title: "Atomic Driver — spare, Burst",
    description:
      "An Atomic driver off a Maximum Garuda. The free-spinning ring turns without catching and the tip has even wear. Fits any Burst layer-and-disc combo.",
    categorySlugs: [
      "category-driver-atomic",
      "category-burst-drivers",
      "category-burst-parts",
      "category-beyblade-burst",
      "category-spinning-tops",
    ],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 260,
    currency: "INR",
    gstRate: 5,
    hsnCode: "95030020",
    stockQuantity: 2,
    availableQuantity: 2,
    isSold: false,
    mainImage: "/media/category-driver-atomic-image",
    images: seedGallery("/media/category-driver-atomic-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.USED,
    listingType: "spares" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    partGlossaryId: "driver--atomic",
    unitLabel: "Maximum Garuda pull",
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["spares", "driver", "burst"],
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
    searchTxt: buildSearchTxt([
      "Atomic Driver — spare, Burst",
      "An Atomic driver off a Maximum Garuda.",
      "Beyblade",
      "brand-beyblade",
      ["Atomic", "Drivers", "Burst Parts"],
      ["spares", "driver", "burst"],
    ]),
  } as unknown as Partial<ProductDocument>,
  {
    /*
     * 🛑 The SOLD fixture, and it is not optional.
     *
     * The "Sold & Ended" availability scope is otherwise EMPTY for this type,
     * so the middle tab on `/spares` would render nothing and be untestable —
     * the same gap CLAUDE.md records being closed for every other listing type
     * on 2026-08-24. Status stays `published`: an archived row is removed by
     * the status filter before the availability predicate ever runs, so an
     * archived fixture proves nothing about the scope.
     */
    id: "spare-eight-heavy-weight-disk-sold",
    slug: "spare-eight-heavy-weight-disk-sold",
    title: "Eight Heavy Weight Disk — mint, sold",
    description:
      "A mint Eight Heavy weight disk with no oxidation at all, from a sealed Galeon. Sold.",
    categorySlugs: [
      "category-eight-heavy",
      "category-original-weight-disks",
      "category-original-parts",
      "category-beyblade-original",
      "category-spinning-tops",
    ],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    price: 390,
    currency: "INR",
    gstRate: 5,
    hsnCode: "95030020",
    stockQuantity: 1,
    availableQuantity: 0,
    isSold: true,
    mainImage: "/media/category-eight-heavy-image",
    images: seedGallery("/media/category-eight-heavy-image"),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.LIKE_NEW,
    listingType: "spares" as const,
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    partGlossaryId: "weight-disk--eight-heavy",
    colourway: "Unoxidised silver",
    unitLabel: "Sealed Galeon pull",
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["spares", "weight-disk", "sold-out"],
    createdAt: new Date("2026-10-19"),
    updatedAt: new Date("2026-10-19"),
    searchTxt: buildSearchTxt([
      "Eight Heavy Weight Disk — mint, sold",
      "A mint Eight Heavy weight disk with no oxidation at all.",
      "Beyblade",
      "brand-beyblade",
      ["Eight Heavy", "Weight Disks", "Original Parts"],
      ["spares", "weight-disk", "sold-out"],
    ]),
  } as unknown as Partial<ProductDocument>,

  /*
   * ── Beyblade X Elevate bit (E) ───────────────────────────────────────────
   *
   * The first X-generation spare in this file — every other row is Original /
   * Metal / Burst. `category-elevate` is a real tier-4 part leaf and
   * `bit--elevate` is a real glossary row (3.2 g, Basic Line, BX-36 /
   * Hasbro G1669, 14 Sep 2024), both verified against the committed seed.
   *
   * 🛑 `mainImage` is NOT the part leaf's own cover — `category-elevate` has
   * no uploaded image, which is exactly the case the file header says to leave
   * out rather than point at a slug that 404s. So the photo was fetched from
   * the wiki specifically for this listing by
   * `scripts/fetch-elevate-bit-image.mjs` and uploaded under its own shortId;
   * `editorialImage()` resolves it to `/media/spare-image-elevate-bit`.
   *
   * Condition is NEW and stock is 40: this is a retail spare off a boosted
   * pull, not a single used component like the rows above it.
   */
  {
    id: "spare-bit-elevate-beyblade-x",
    slug: "spare-bit-elevate-beyblade-x",
    title: "Elevate Bit (E) — Beyblade X spare",
    description:
      "A loose Elevate bit for Beyblade X. 3.2 g, Basic Line, first released 14 September 2024 as BX-36 (Takara-Tomy) / G1669 (Hasbro). Its raised dome lifts the blade off the floor on impact, trading some stamina for burst resistance and a distinctive high-angle recovery. Shipped with WhaleWave 5-80E and SharkEdge 4-70E among others.",
    categorySlugs: [
      "category-elevate",
      "category-x-bits",
      "category-x-parts",
      "category-beyblade-x",
      "category-spinning-tops",
    ],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    franchiseSlug: "franchise-beyblade",
    franchise: "Beyblade",
    price: 299,
    currency: "INR",
    gstRate: 5,
    hsnCode: "95030020",
    stockQuantity: 40,
    availableQuantity: 40,
    isSold: false,
    mainImage: editorialImage("spare-image-elevate-bit"),
    images: seedGallery(editorialImage("spare-image-elevate-bit")),
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    listingType: "spares" as const,
    storeId: "store-letitrip-official",
    storeName: "LetItRip Official",
    partGlossaryId: "bit--elevate",
    customFields: [],
    customSections: [],
    featured: false,
    isPromoted: false,
    isOnSale: false,
    tags: ["spares", "bit", "beyblade-x", "basic-line"],
    createdAt: new Date("2026-10-21"),
    updatedAt: new Date("2026-10-21"),
    searchTxt: buildSearchTxt([
      "Elevate Bit (E) — Beyblade X spare",
      "A loose Elevate bit for Beyblade X, 3.2 g, Basic Line, BX-36.",
      "Takara-Tomy",
      "brand-takara-tomy",
      ["Elevate", "Bits", "Beyblade X Parts"],
      ["spares", "bit", "beyblade-x", "basic-line"],
    ]),
  } as unknown as Partial<ProductDocument>,
];

/*
 * 🛑 The wrappers go AFTER the closing `]`, applied to the whole array — never
 * to a spread inside it.
 *
 * This file's siblings carry the scar: `products-auctions-seed-data.ts` had
 * `..._raw.map(withTokens)` with fixtures appended after the spread, so the
 * appended rows got none of it. That was found once for `searchTxt`, fixed, and
 * documented in a comment directly above the pipeline — and `listingType`
 * stayed inside the spread, so the same bug survived its own fix one field
 * over, under a comment describing it. A missing `listingType` is silent in the
 * worst way: `normalizeListingType` returns `?? "standard"` so the row looks
 * right in every inspection, while a Firestore equality cannot match an absent
 * field — the row is absent from its own catalogue while rendering perfectly by
 * slug (Root Cause #101).
 *
 * `audit-seed-listing-type` is strict-zero on exactly that, with no suppression
 * marker, and it checks the slug prefix agrees too.
 */
export const productsSparesSeedData: Partial<ProductDocument>[] =
  _rawProductsSparesSeedData.map(withFinalSale).map(withDerivedCategoryNames);
