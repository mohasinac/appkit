/*
 * WHY: Seeds a Beyblade auction catalog with real state variety — the original 2-fixture
 *      file only ever exercised "active, bids already started" auctions, so features like
 *      Buy-Now-before-first-bid, reserve-not-met, and a closed/won auction with a real
 *      winner were structurally impossible to test against permanent data (see CLAUDE.md
 *      Recurrent Root Cause Pattern for seed-data blandness sweep, 2026-08-20 session).
 *      Also fixes a real field-name bug: the two original fixtures set `buyItNowPrice`
 *      (a distinct, no-bids-yet-only BIN field) but AuctionDetailPageView.tsx reads
 *      `buyNowPrice` — so neither auction's Buy Now button/price ever rendered.
 * WHAT: Exports 9 auction products with listingType:"auction" — 2 original fixtures
 *       (field-bug fixed, specs/tags added) + 6 new: a Buy-Now-only auction (zero bids,
 *       bidsHaveStarted:false), a reserve-not-met auction, a closed/won auction with a
 *       winning bidder, and 3 more active auctions with varied end dates/bid activity.
 *
 * EXPORTS:
 *   productsAuctionsSeedData — Array of 9 auction products with listingType:"auction"
 *
 * @tag domain:auctions,products
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import { ProductDocument, ProductSpecification } from "../features/products/schemas/firestore";
import { PRODUCT_FIELDS } from "../constants/field-names";
import { buildSearchTokens } from "../utils/search-tokens";
import { seedExtMedia } from "./_helpers/media";

function withTokens(p: Partial<ProductDocument>): Partial<ProductDocument> {
  return {
    tags: [],
    featured: false,
    price: p.startingBid ?? 0,
    stockQuantity: 1,
    availableQuantity: p.isSold ? 0 : 1,
    ...p,
    searchTokens: buildSearchTokens(
      p.title, p.description, p.brand, p.brandSlug,
      p.categoryNames, p.tags, p.features, p.condition,
      p.specifications?.map((s) => `${s.name} ${s.value}`),
    ),
  };
}

const DRANZER_SPECS: ProductSpecification[] = [
  { name: "Spin Direction", value: "Right (Right-Spin)" },
  { name: "Type", value: "Attack" },
  { name: "Weight", value: "32.9", unit: "g" },
];

const _rawProductsAuctionsSeedData: Partial<ProductDocument>[] = [
  // --- Original 2 fixtures — buyNowPrice field-name bug fixed + specs/tags added ---
  {
    id: "auction-beyblade-original-dragoon-storm",
    slug: "auction-beyblade-original-dragoon-storm",
    title: "Beyblade Original — Dragoon Storm (Rare Sealed)",
    description: "Sealed, unopened Dragoon Storm from the original 1999-2003 series. A grail piece for original-generation collectors.",
    categorySlugs: ["category-original-plastic-gen","category-original-tops","category-beyblade-original","category-spinning-tops"],
    categoryNames: ["Plastic Generation","Original Tops","Beyblade Original","Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    startingBid: 2999,
    buyNowPrice: 5999,
    currentBid: 3499,
    currency: "INR",
    auctionEndDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    bidCount: 3,
    bidsHaveStarted: true,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-original-dragoon-storm-1-20260101/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-original-dragoon-storm-1-20260101/900/900"),
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-original-dragoon-storm-2-20260101/900/900"),
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-original-dragoon-storm-3-20260101/900/900"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["vintage-collectible", "sealed"],
    specifications: DRANZER_SPECS,
    customFields: [{ key: "Sealed / Unopened", type: "boolean", value: "true" }],
    // Added 2026-08-21 — an authenticity/unboxing video makes narrative sense
    // on a rare sealed grail piece, and gives the auction detail page's
    // gallery a fixture beyond the standard-product-only video-demo cluster
    // (products-standard-seed-data.ts). YouTube-sourced, same as that file's
    // Metal Fight fixture — exercises getYouTubeVideoId()'s iframe-embed path
    // on a non-standard listing type.
    video: {
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      thumbnailUrl: seedExtMedia("https://picsum.photos/seed/auction-video-thumb-beyblade-original-dragoon-storm-20260821/800/450"),
      duration: 212,
    },
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-05-18"),
    updatedAt: new Date("2026-05-21"),
  },
  {
    id: "auction-beyblade-metal-lightning-l-drago",
    slug: "auction-beyblade-metal-lightning-l-drago",
    title: "Metal Fight Beyblade BB-99 Lightning L-Drago",
    description: "Lightning L-Drago 100HF/S, a highly sought-after Metal Fury era top in excellent condition.",
    categorySlugs: ["category-metal-masters","category-metal-tops","category-beyblade-metal","category-spinning-tops"],
    categoryNames: ["Metal Masters","Metal Fight Tops","Beyblade Metal Fight","Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    startingBid: 1999,
    buyNowPrice: 4499,
    currentBid: 3199,
    currency: "INR",
    auctionEndDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    bidCount: 13,
    bidsHaveStarted: true,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-metal-lightning-l-drago-1-20260101/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-metal-lightning-l-drago-1-20260101/900/900"),
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-metal-lightning-l-drago-2-20260101/900/900"),
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-metal-lightning-l-drago-3-20260101/900/900"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.GOOD,
    tags: ["attack-type", "tournament-grade"],
    specifications: [
      { name: "Spin Direction", value: "Left (Left-Spin)" },
      { name: "Type", value: "Attack" },
      { name: "Weight", value: "54.3", unit: "g" },
      { name: "Track & Bottom", value: "100 / HF/S (Hole Flat/Spike)" },
    ],
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-05-19"),
    updatedAt: new Date("2026-05-22"),
  },

  // --- The clean buyout fixture: BIN price well above the standing bid ---
  // (It also happens to have zero bids, but that is no longer WHY Buy Now is
  //  offered — the `bidsHaveStarted` gate was dropped 2026-08-24. What matters
  //  now is `buyNowPrice > currentBid`, which holds here 1299 > 799.)
  {
    id: "auction-beyblade-x-shark-edge",
    slug: "auction-beyblade-x-shark-edge",
    title: "Beyblade X BX-04 Shark Edge (Buy It Now Available)",
    description: "Shark Edge 3-60GF straight from a fresh case pull. Grab it at the Buy It Now price before the clock runs, or start the bidding.",
    categorySlugs: ["category-x-boosters","category-x-tops","category-beyblade-x","category-spinning-tops"],
    categoryNames: ["Boosters","Beyblade X Tops","Beyblade X","Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    startingBid: 799,
    buyNowPrice: 1299,
    currentBid: 799,
    currency: "INR",
    auctionEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    bidCount: 0,
    bidsHaveStarted: false,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-x-shark-edge-1-20260814/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-x-shark-edge-1-20260814/900/900"),
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-x-shark-edge-2-20260814/900/900"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["balance-type", "starter-set"],
    specifications: [
      { name: "Spin Direction", value: "Right (Right-Spin)" },
      { name: "Type", value: "Balance" },
      { name: "Weight", value: "37.2", unit: "g" },
      { name: "Blade / Ratchet / Bit", value: "Shark Edge / 3-60 / Glide Flat" },
    ],
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-08-14"),
    updatedAt: new Date("2026-08-14"),
  },

  // --- NEGATIVE CONTROL: bidding has passed the buy-now price ---
  // Buy Now must be offered NOWHERE for this listing — not the button on the
  // detail page, not the advertised price above it, not the Buyout chip on the
  // card. Before the 2026-08-24 rework those three sites used three different
  // conditions, so this state was unreachable as a test case.
  {
    id: "auction-beyblade-burst-xcalius-passed-bin",
    slug: "auction-beyblade-burst-xcalius-passed-bin",
    title: "Beyblade Burst Xcalius X2 (bidding passed Buy It Now)",
    description: "Xcalius X2 attack type. The Buy It Now price has already been overtaken by live bidding, so only bidding remains.",
    categorySlugs: ["category-burst-cho-z","category-burst-tops","category-beyblade-burst","category-spinning-tops"],
    categoryNames: ["Cho-Z","Burst Tops","Beyblade Burst","Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    startingBid: 700,
    buyNowPrice: 1400,
    currentBid: 1650,
    currency: "INR",
    auctionEndDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    bidCount: 7,
    bidsHaveStarted: true,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-burst-xcalius-1-20260824/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-burst-xcalius-1-20260824/900/900"),
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-burst-xcalius-2-20260824/900/900"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["attack-type", "burst"],
    specifications: [
      { name: "Spin Direction", value: "Right (Right-Spin)" },
      { name: "Type", value: "Attack" },
      { name: "Weight", value: "33.8", unit: "g" },
    ],
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-08-24"),
    updatedAt: new Date("2026-08-24"),
  },

  // --- Reserve not met: currentBid sits below reservePrice ---
  {
    id: "auction-beyblade-original-seaborg",
    slug: "auction-beyblade-original-seaborg",
    title: "Beyblade Original — Seaborg 2000 (Reserve Auction)",
    description: "Rare Seaborg 2000 defense-type top from the original series. Reserve price set by the seller — current bids haven't met it yet.",
    categorySlugs: ["category-original-hms","category-original-tops","category-beyblade-original","category-spinning-tops"],
    categoryNames: ["Heavy Metal System","Original Tops","Beyblade Original","Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    startingBid: 1499,
    reservePrice: 4000,
    currentBid: 2200,
    currency: "INR",
    auctionEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    bidCount: 4,
    bidsHaveStarted: true,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-original-seaborg-1-20260814/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-original-seaborg-1-20260814/900/900"),
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-original-seaborg-2-20260814/900/900"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.GOOD,
    tags: ["defense-type", "vintage-collectible"],
    specifications: [
      { name: "Spin Direction", value: "Right (Right-Spin)" },
      { name: "Type", value: "Defense" },
      { name: "Weight", value: "35.6", unit: "g" },
    ],
    customFields: [{ key: "Reserve Disclosed", type: "boolean", value: "false" }],
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-08-13"),
    updatedAt: new Date("2026-08-19"),
  },

  // --- Closed/won: ended in the past, leadingBidderId set, isSold true ---
  {
    id: "auction-beyblade-metal-diablo-nemesis",
    slug: "auction-beyblade-metal-diablo-nemesis",
    title: "Metal Fight Beyblade BB-122 Diablo Nemesis (Ended — Sold)",
    description: "Diablo Nemesis XF, the final boss top of Metal Fight Beyblade Zero-G. Auction closed with a winning bidder.",
    categorySlugs: ["category-metal-fury","category-metal-tops","category-beyblade-metal","category-spinning-tops"],
    categoryNames: ["Metal Fury","Metal Fight Tops","Beyblade Metal Fight","Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    startingBid: 3499,
    currentBid: 6200,
    currency: "INR",
    auctionEndDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    bidCount: 6,
    bidsHaveStarted: true,
    leadingBidderId: "user-rohit-collector",
    isSold: true,
    mainImage: seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-metal-diablo-nemesis-1-20260810/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-metal-diablo-nemesis-1-20260810/900/900"),
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-metal-diablo-nemesis-2-20260810/900/900"),
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-metal-diablo-nemesis-3-20260810/900/900"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.LIKE_NEW,
    tags: ["attack-type", "tournament-grade"],
    specifications: [
      { name: "Spin Direction", value: "Right (Right-Spin)" },
      { name: "Type", value: "Attack" },
      { name: "Weight", value: "58.9", unit: "g" },
      { name: "Track & Bottom", value: "XF (Xtreme Fusion)" },
    ],
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-08-01"),
    updatedAt: new Date("2026-08-10"),
  },

  // --- Closed by BUY NOW: ended early, a real buyout bid won it ---
  // Nothing in the seed demonstrated a buyout before W2, so the only fixture
  // for `sourceContext.path === "auction-buy-now"` would have been a dangling
  // FK. A buyout is a REAL bid (`isBuyout: true`), so `bidCount` counts the
  // competitive ladder AND the buyout that ended it — 3 + 1 here.
  {
    id: "auction-beyblade-burst-spriggan-requiem-bought-out",
    slug: "auction-beyblade-burst-spriggan-requiem-bought-out",
    title: "Beyblade Burst B-128 Spriggan Requiem (Ended — Bought Out)",
    description:
      "Spriggan Requiem, the dual-spin legend of Burst Super Z. Bidding had reached ₹3,100 when a buyer took the ₹4,999 Buy Now price and ended the auction early.",
    categorySlugs: ["category-burst-tops","category-beyblade-burst","category-spinning-tops"],
    categoryNames: ["Burst Tops","Beyblade Burst","Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    startingBid: 2499,
    currentBid: 3100,
    buyNowPrice: 4999,
    currency: "INR",
    auctionEndDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    bidCount: 4,
    bidsHaveStarted: true,
    leadingBidderId: "user-seto-kaiba",
    isSold: true,
    mainImage: seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-burst-spriggan-requiem-1-20260810/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-burst-spriggan-requiem-1-20260810/900/900"),
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-burst-spriggan-requiem-2-20260810/900/900"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.LIKE_NEW,
    tags: ["balance-type", "dual-spin"],
    specifications: [
      { name: "Spin Direction", value: "Dual (Left / Right)" },
      { name: "Type", value: "Balance" },
      { name: "Weight", value: "51.2", unit: "g" },
    ],
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-08-01"),
    updatedAt: new Date("2026-08-20"),
  },

  // --- Additional active auctions, varied end dates + bid activity ---
  {
    id: "auction-beyblade-burst-cho-z-achilles",
    slug: "auction-beyblade-burst-cho-z-achilles",
    title: "Beyblade Burst B-100 Cho-Z Achilles",
    description: "Cho-Z Achilles.Ow.Zn', a Super Zeta stamina-type top from the Cho-Z generation, in excellent spinning condition.",
    categorySlugs: ["category-burst-superking","category-burst-tops","category-beyblade-burst","category-spinning-tops"],
    categoryNames: ["Superking","Burst Tops","Beyblade Burst","Spinning Tops"],
    brandSlug: "brand-beyblade",
    brand: "Beyblade",
    startingBid: 1199,
    buyNowPrice: 2499,
    currentBid: 1650,
    currency: "INR",
    auctionEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    bidCount: 2,
    bidsHaveStarted: true,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-burst-cho-z-achilles-1-20260815/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-burst-cho-z-achilles-1-20260815/900/900"),
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-burst-cho-z-achilles-2-20260815/900/900"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.GOOD,
    tags: ["stamina-type"],
    specifications: [
      { name: "Spin Direction", value: "Right (Right-Spin)" },
      { name: "Type", value: "Stamina" },
      { name: "Weight", value: "29.8", unit: "g" },
      { name: "Layer / Disc / Driver", value: "Cho-Z Achilles / .Ow / Zn'" },
    ],
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-08-15"),
    updatedAt: new Date("2026-08-18"),
  },
  {
    id: "auction-beyblade-x-wizard-fafnir",
    slug: "auction-beyblade-x-wizard-fafnir",
    title: "Beyblade X BX-06 Wizard Fafnir (Long-Running Auction)",
    description: "Wizard Fafnir 4-60F, one week left on the clock — a rare Beyblade X chase top with active bidding.",
    categorySlugs: ["category-x-starters","category-x-tops","category-beyblade-x","category-spinning-tops"],
    categoryNames: ["Starter Sets","Beyblade X Tops","Beyblade X","Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    startingBid: 999,
    currentBid: 1450,
    currency: "INR",
    auctionEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    bidCount: 3,
    bidsHaveStarted: true,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-x-wizard-fafnir-1-20260816/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-x-wizard-fafnir-1-20260816/900/900"),
      seedExtMedia("https://picsum.photos/seed/auction-image-beyblade-x-wizard-fafnir-2-20260816/900/900"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.NEW,
    tags: ["balance-type"],
    specifications: [
      { name: "Spin Direction", value: "Right (Right-Spin)" },
      { name: "Type", value: "Balance" },
      { name: "Weight", value: "38.4", unit: "g" },
      { name: "Blade / Ratchet / Bit", value: "Wizard Fafnir / 4-60 / Flat" },
    ],
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-08-16"),
    updatedAt: new Date("2026-08-19"),
  },
];

export const productsAuctionsSeedData: Partial<ProductDocument>[] = [
  ..._rawProductsAuctionsSeedData.map((a) => withTokens({
    ...a,
    listingType: PRODUCT_FIELDS.LISTING_TYPE_VALUES.AUCTION,
  })),
  {
    // Ended with NO winner — reserve never met, zero bids.
    //
    // Deliberately `isSold: false` with stock still on the document: this is
    // the fixture that proves the auction branch reads `auctionEndDate`
    // rather than falling through to the shared isSold/quantity checks. The
    // other ended auction (diablo-nemesis) is sold AND ended, so it passes
    // the base check and exercises nothing type-specific.
    id: "auction-beyblade-burst-lord-spryzen-ended-unsold",
    slug: "auction-beyblade-burst-lord-spryzen-ended-unsold",
    title: "Beyblade Burst B-174 Lord Spryzen (Ended — Reserve Not Met)",
    description: "Auction closed without meeting its reserve, so no winner was declared. Relisting soon.",
    categorySlugs: ["category-burst-classic","category-burst-tops","category-beyblade-burst","category-spinning-tops"],
    categoryNames: ["Burst Classic","Burst Tops","Beyblade Burst","Spinning Tops"],
    brandSlug: "brand-takara-tomy",
    brand: "Takara-Tomy",
    startingBid: 1999,
    currentBid: 1999,
    reservePrice: 3500,
    currency: "INR",
    auctionEndDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    bidCount: 0,
    bidsHaveStarted: false,
    isSold: false,
    mainImage: seedExtMedia("https://picsum.photos/seed/auction-image-lord-spryzen-ended-1-20260824/900/900"),
    images: [
      seedExtMedia("https://picsum.photos/seed/auction-image-lord-spryzen-ended-1-20260824/900/900"),
    ],
    status: PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED,
    condition: PRODUCT_FIELDS.CONDITION_VALUES.LIKE_NEW,
    tags: ["stamina-type"],
    storeId: "store-beyblade-arena",
    storeName: "Beyblade Arena",
    createdAt: new Date("2026-08-10"),
    updatedAt: new Date("2026-08-24"),
  },
];
