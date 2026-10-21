/**
 * Products Firestore Document Types & Constants
 */

import {
  generateProductId,
  generateAuctionId,
  generatePreOrderId,
  type GenerateProductIdInput,
  type GenerateAuctionIdInput,
  type GeneratePreOrderIdInput,
} from "../../../utils/id-generators";
import type { ProductStatus, ListingType, ProductImage } from "../types";

export type { ProductImage };
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { LotteryConfig } from "../../lottery/types";

export interface ProductVideoField {
  url: string;
  thumbnailUrl: string;
  duration: number;
  trimStart?: number;
  trimEnd?: number;
}

/**
 * Whatever a document, a request body or a seed row happens to hold, as
 * `ProductImage[]`.
 *
 * 🛑 This is called on the WRITE path (`ProductRepository.create`/`update`)
 * **and** on the read path (`mapDoc`), and both are required. Root Cause #101
 * is exactly this shape: `mapDoc` backfilled `categorySlugs` on read while the
 * write schema stripped it, so the field was present on every object anyone
 * inspected and absent from the stored document — invisible to every query,
 * and latent until a human created a listing.
 *
 * Accepts `string`, `ProductImage`, and a mixed array of both, because a
 * partially-migrated collection genuinely contains all three.
 */
export function toProductImages(input: unknown): ProductImage[] {
  if (!Array.isArray(input)) return [];
  const out: ProductImage[] = [];
  for (const entry of input) {
    if (typeof entry === "string") {
      if (entry) out.push({ url: entry });
      continue;
    }
    if (entry && typeof entry === "object") {
      /*
       * `Partial<ProductImage>`, NOT `{ url?: unknown }` — one narrowing
       * instead of two casts, and no `unknown` in a local binding
       * (`audit-unknown-leakage` flagged the earlier spelling, correctly: an
       * `unknown` here defeats the checking on every member read below it).
       * Every member is still validated before use, so the assertion is
       * narrowing a shape we are about to prove rather than asserting a fact.
       */
      const e = entry as Partial<ProductImage>;
      if (typeof e.url !== "string" || !e.url) continue;
      /*
       * 🛑 EVERY optional member is carried through, not just the two A6
       * added. This runs on the WRITE path, so a member it forgets is a
       * member it DESTROYS on the next save — and `thumbnailUrl`/`order`
       * predate this function. Adding a field to `ProductImage` means adding
       * it here; the alternative is a normaliser that quietly truncates the
       * type it claims to normalise.
       */
      out.push({
        url: e.url,
        ...(e.alt ? { alt: e.alt } : {}),
        ...(e.thumbnailUrl ? { thumbnailUrl: e.thumbnailUrl } : {}),
        ...(typeof e.order === "number" ? { order: e.order } : {}),
        ...(typeof e.width === "number" ? { width: e.width } : {}),
        ...(typeof e.height === "number" ? { height: e.height } : {}),
      });
    }
  }
  return out;
}

/**
 * Just the URLs, in order — for the many call sites that only ever needed a
 * `string[]` (a lightbox's source list, an OG image pick, a media-abort
 * cleanup list).
 *
 * This is a PROJECTION, computed on demand, not a stored mirror — so it cannot
 * drift from `images` the way a denormalised second field would (Root Cause
 * #42). Takes `unknown` so it also works on a legacy `string[]`.
 */
export function productImageUrls(input: unknown): string[] {
  return toProductImages(input).map((i) => i.url);
}

export interface ProductSpecification {
  name: string;
  value: string;
  unit?: string;
}

export type CustomFieldType = "text" | "number" | "boolean" | "url";

export interface CustomField {
  key: string;
  type: CustomFieldType;
  value: string;
  unit?: string;
}

export const MAX_CUSTOM_FIELDS = 50;
export const MAX_CUSTOM_SECTIONS = 3;

export type CustomSection = {
  id: string;
  title: string;
  text?: string;
  fields?: CustomField[];
}

// SB-UNI-G 2026-05-13 — TCGPlayer-style grading metadata.
export type GradingService = "PSA" | "BGS" | "CGC" | "SGC" | "OTHER";

export interface ProductGrading {
  /** Grading service (PSA / BGS / CGC / SGC / OTHER) — sortable index field. */
  service: GradingService;
  /** Numeric grade out of 10 (BGS uses 0.5 increments; PSA/CGC integer). */
  grade: number;
  /** Slab cert number (PSA cert lookup URL is built from this client-side). */
  certNumber?: string;
  /** Slab/grade image media slug (uploaded via the signed-URL flow). */
  slabImageMedia?: string;
  /** Free-form key/value attrs (e.g. autograph=yes, subgrades=9.5/10/10/9.5). */
  attributes?: Record<string, string>;
}

// SB-UNI-G 2026-05-13 — single-card aftermarket metadata.
export interface ProductCardMetadata {
  /** TCG set name (e.g. "Pokémon Base Set"). */
  setName: string;
  /** Year the set was published. */
  setYear?: number;
  /** Card number within the set (e.g. "108/120"). */
  cardNumber?: string;
  /** Rarity tier (Common / Uncommon / Rare / Holo / etc — free-form). */
  rarity?: string;
  /** Card language (en, jp, etc). */
  language?: string;
}

// SB-UNI-I 2026-05-13 — Classified-listing fields (OLX / Facebook Marketplace pattern).
// Add-to-cart is rejected at the capability layer. The purchase path is the
// Make-an-Offer flow, which for this type is always available — see
// `offerIsOnlyPurchasePath` in `_internal/shared/features/offers/config`.
//
// 🛑 `contactMethod?: "chat" | "phone" | "both"` was removed 2026-08-31. It had
// two read sites, both of which merely PRINTED it — so a buyer read the literal
// word "chat" on the page — and it was never branched on anywhere. `"phone"` was
// unimplementable in any case: no phone number field exists on this meta, on
// `ProductDocument`, or on the public store projection.
export interface ProductClassifiedMeta {
  /** Where the item is — drives the (listingType, classified.meetupArea.city, createdAt) index. */
  meetupArea: {
    city: string;
    locality?: string;
    pincode?: string;
  };
  /** Seller offers shipping in addition to meetup. */
  acceptsShipping?: boolean;
  /**
   * Price is negotiable — UI hints "₹X (negotiable)".
   *
   * Its sibling `allowOffers` is what actually gates the offer FLOOR on this
   * type: unset means the buyer may still request to buy, but only at the
   * asking price.
   */
  negotiable?: boolean;
}

// SB-UNI-J 2026-05-13 — Digital-code listing fields (Steam pattern).
// Codes themselves live in the encrypted subcollection
// `products/{id}/codes/{codeId}` (added when Phase 5 SB-UNI-N reveal flow ships).
export interface ProductDigitalCodeMeta {
  /** How the code is fulfilled — claim-at-paid / manual-via-email / etc. */
  codeDeliveryMethod: "auto-claim" | "manual-email";
  /** Total codes in the pool — operational view. */
  codePoolSize?: number;
  /** Atomic counter decremented on claim; never goes negative. */
  codesAvailable?: number;
  /** Free-form redemption instructions surfaced on the order detail page. */
  redemptionInstructions?: string;
  /** Codes expire at — orders past this point reject claim. */
  expiresAt?: Date;
}

// SB-UNI-K 2026-05-13 — Live-item listing fields (animals / plants).
// `listingType:"live"` requires vendor verification + jurisdiction match
// at add-to-cart. Carrier handoff is handled per-store (manual shipping).
export interface ProductLiveItemMeta {
  /** Species or cultivar name (taxonomic where applicable). */
  species: string;
  /** Animal/plant age in months at the time of listing. */
  ageMonths?: number;
  /** Biological sex / not-applicable. */
  sex?: "male" | "female" | "unknown" | "n/a";
  /** Free-form care instructions surfaced at checkout consent. */
  careInfo?: string;
  /** Transport details — carrier method, fees, insurance flag. */
  transport: {
    method: "courier" | "in-person" | "specialist";
    handlingFee?: number;
    insuranceIncluded?: boolean;
  };
  /** Allowed buyer-state ISO 3166-2 codes (e.g. "IN-MH"). */
  jurisdictionAllowed: string[];
  /** Set by admin verification workflow — gate for listing creation. */
  vendorVerified?: boolean;
  /** CITES permit number (Appendix I/II species). */
  cites?: string;
}

/**
 * Print-specific metadata shared by the "art" and "stickers" listing types
 * (both are printed-only physical goods). Every field optional so partial
 * seller input still saves.
 */
export interface ProductPrintMeta {
  /** e.g. "A4", "12x18 in", "5x5 cm sheet". */
  size?: string;
  /** e.g. "Matte photo paper", "Vinyl", "Canvas". */
  material?: string;
  /** e.g. "Glossy", "Matte", "Holographic". */
  finish?: string;
  /** Limited-edition print run size; omitted for open editions. */
  editionSize?: number;
}

/**
 * Licensed manufacture vs. an unbranded 1st copy vs. not established.
 *
 * 🛑 THERE IS NO "fake" VALUE, and that is a product decision rather than an
 * omission. A poor-quality counterfeit — BAS's own buying guide names cadmium
 * and lead in the metal parts — is not a listing state we offer. It is a
 * report, and it belongs in the scam registry, which already has 27 scam
 * types and an evidence model.
 *
 * "reproduction" is the midfake tier: largely Chinese, no manufacturer's
 * marque, generally decent quality, and some WBO formats permit certain repro
 * parts — so it is sellable WHEN LABELLED. "unverified" exists because the
 * alternative is far worse: without it, an honest seller who does not know
 * would have to pick "original", and silence would be indistinguishable from
 * a genuine claim.
 *
 * 🛑 And the buyer-facing framing to design against is NOT "fake". The
 * counterfeit seller in the crawl makes no authenticity claim at all — zero
 * occurrences of original/Takara/authentic/replica/fake across 1,277 products
 * — and sells itself as an "aftermarket brand" with "upgraded components".
 * "Aftermarket" and "custom" are the words our buyers will be sold, so the
 * help copy has to answer that, not a word nobody uses.
 */
export type ProductAuthenticity = "original" | "reproduction" | "unverified";

export interface ProductDocument extends BaseDocument {
  title: string;
  description: string;
  slug?: string;

  /** Test-data flag — set on shared admin-seeded test products; swept by testDataCleanup. */
  isTestData?: boolean;
  /** When isTestData, the cutoff after which testDataCleanup deletes this doc (cascades to bids). */
  testDataExpiresAt?: Date;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  /**
   * I1 — the ASSIGNED categories. What a human picked, and the only one of the
   * three category fields that is authored rather than derived.
   *
   * At most `MAX_CATEGORY_ASSIGNMENTS` (4), and 🛑 **at most ONE per root** —
   * "a category can be multiple, they should not be under same tree". A single
   * files at LEAVES, a lot at NON-LEAVES. All of it is enforced in
   * `assertAssignmentShape`, which `deriveTaxonomy` calls on every write path.
   *
   * `categoryIds[0]` is NOT the default — the default is the DEEPEST assignment
   * (count breaks a tie), and `categorySlugs[0]` is what carries it.
   */
  categoryIds?: string[];
  /**
   * I5b — DERIVED. One display name per assignment, parallel to `categoryIds`.
   *
   * Lets the breadcrumb row offer the OTHER categories as real links without a
   * second read on a cached page. Deliberately not their full chains: the
   * alternate crumb shows the other categories, never N stacked trails.
   */
  categoryIdNames?: string[];
  /**
   * DERIVED closure over every assignment — the field every category QUERY
   * matches on, via `array-contains` / `array-contains-any`.
   *
   * 🛑 ORDERED, and that is load-bearing: the DEFAULT chain first (so
   * `categorySlugs[0]` is still the default leaf, which ~30 call sites read it
   * as), then each remaining chain leaf-first, deduped. A set-shaped union
   * would break all of them silently — see `category-assignment.ts`'s header.
   *
   * Never authored. An inbound value is treated as a legacy single leaf: only
   * its HEAD is read, as one assignment.
   */
  categorySlugs: string[];
  /**
   * Display-name cache for the DEFAULT chain only, leaf-first.
   *
   * 🛑 Deliberately NOT parallel to `categorySlugs` once a product has two
   * assignments: a union of two chains has no readable path, and the breadcrumb
   * builder reverses this array to render root-first. Keeping it single-chain
   * is what leaves every existing breadcrumb byte-identical.
   */
  categoryNames?: string[];
  /**
   * The default leaf, mirrored. 🛑 NOT dead and NOT read-only, whatever the
   * `@deprecated` tag here said for a long time: it is in
   * `PRODUCT_UPDATABLE_FIELDS`, it is what `CategoryInlineSelect` writes, it is
   * the one category key `productCreateSchema` declares, and `deriveTaxonomy`
   * prefers it over the derived chain. Sending it alone still means exactly
   * "one assignment".
   */
  category?: string;
  /** @deprecated Read-only alias. */
  categoryName?: string;
  subcategory?: string;
  brand?: string;
  brandSlug?: string;
  /**
   * The IP this product is FROM — "Beyblade", "Pokémon". A sibling of `brand`
   * (who MADE it), matching a `categoryType: "franchise"` row.
   *
   * 🛑 `franchiseSlug` is the match key here, NOT the display name — the
   * opposite of `brand`, which `BrandDetailPageView` filters on by display name
   * and which therefore orphans its whole catalogue on a rename (see
   * `_helpers/brand-rows.ts`, trap 1). Franchise is new, so it gets the
   * correct shape from the start rather than inheriting that trap; `franchise`
   * is the denormalised label for display only.
   */
  franchise?: string;
  franchiseSlug?: string;
  price: number;
  /**
   * The strike-through "was ₹X", for a listing the seller is discounting.
   *
   * 🛑 F1 #25, and it was TWO OWNERS of one value rather than a missing field.
   * `SellerProductShell` renders an input called `compareAtPrice` and the eight
   * store edit pages read `(product as any).compareAtPrice` — a property no
   * document has ever carried — while BOTH public renderers (`ProductGrid`,
   * `ProductDetailPageView`) read `originalPrice` and hand it to `GatedPrice`
   * as `originalAmount`, which is what draws the strike-through and derives
   * the discount %. The consumer write schema already accepted `originalPrice`
   * too. So the authoring half wrote one name, the rendering half read
   * another, and the document declared neither: a seller set a sale price,
   * saw a 200, and nothing ever showed it.
   *
   * Declared here under the name the renderers and the write schema already
   * use, rather than adding a second field beside them (Root Cause #75).
   *
   * 🛑 It is a MONEY figure, so it is grossed up with `price` for a
   * `pricesIncludeGst: false` store — a "was" price that silently meant
   * ex-tax while the live price meant inc-tax would overstate the discount.
   */
  originalPrice?: number;
  currency: string;
  stockQuantity: number;
  availableQuantity: number;
  mainImage: string;
  /**
   * 🛑 `ProductImage[]`, not `string[]` (changed 2026-10-20, plan A6).
   *
   * Normalised by `toProductImages()` on BOTH the write path and `mapDoc`, so
   * a legacy `string[]` document widens losslessly and a new write stores the
   * object form. Call sites that only want URLs use `productImageUrls()`.
   */
  images: ProductImage[];
  video?: ProductVideoField;
  status: ProductStatus;
  storeId: string;
  /**
   * Denormalized seller display name — what every listing card renders as
   * "by …", and the only place a card can get it: the public browse query
   * never touches `storeRepository`.
   *
   * Optional for back-compat with documents written before the create paths
   * populated it, NOT because it is optional in practice. `resolveStoreFields`
   * fills it on every create, and a store rename re-syncs it through the
   * `storeNameBackfill` job — that job is the mirror-guard, and removing it
   * turns this into a field that silently goes stale (Root Cause #42).
   */
  storeName?: string;
  /**
   * Denormalized `storeSlug`, so a card or a detail page can build a
   * `/stores/{slug}` link without a second read. Written alongside `storeName`
   * and re-synced by the same job.
   */
  storeSlug?: string;
  /** W1-34 — denormalized seller rating (0–5) shown on product detail store card. */
  storeRating?: number;
  /** W1-34 — denormalized seller total review count shown alongside the rating. */
  storeReviewCount?: number;
  featured: boolean;
  tags: string[];
  specifications?: ProductSpecification[];
  features?: string[];
  shippingInfo?: string;
  returnPolicy?: string;
  /**
   * 🛑 ABSENT MEANS FINAL SALE. The platform default is `true`, so `undefined`
   * and `true` are the same thing and only an explicit `false` opts a listing
   * into change-of-mind returns.
   *
   * Never read this field directly — `!p.finalSale` and `p.finalSale === true`
   * both get `undefined` wrong, in the direction that silently grants returns.
   * Use `isFinalSale(p)` from `features/products/constants/final-sale`.
   *
   * Deliberately NOT in `DEFAULT_PRODUCT_DATA` (a default there would make
   * `undefined` unreachable in new rows while every existing row still lacks
   * it) and NOT in `PRODUCT_INDEXED_FIELDS` (nothing queries it).
   *
   * This blocks a return REASON, not a refund: seller/carrier-fault claims are
   * always accepted. See `_internal/shared/features/orders/return-reasons`.
   */
  finalSale?: boolean;

  /**
   * This listing is a multi-item LOT rather than a single item.
   *
   * 🛑 A lot files under a NON-LEAF category and a single may file anywhere —
   * enforced one-directionally in `ProductRepository.deriveTaxonomy`, which
   * already holds the leaf document so the check costs no extra read. The
   * reason is a claim about the ITEMS, not about counting: filing "12 assorted
   * Burst beys" under `category-dragoon-g` asserts all twelve are Dragoon G.
   *
   * Counting is disambiguated separately, by `categoryCounts` carrying its own
   * `lots` pair — so singles and lots are never summed into one number.
   *
   * A lot is the INVERSE of per-unit selling: many objects, one listing, one
   * stock count. Two physically distinct units of one model are two listings
   * each at `stockQuantity: 1` (see `unitLabel`), never one listing of two.
   */
  isLot?: boolean;
  /**
   * How many items the lot contains. Drives the "lot of 12" label and the
   * per-item price hint.
   *
   * Deliberately NOT required when `isLot` is true: a seller who knows it is a
   * lot but has not counted the pile yet must still be able to save a draft.
   */
  lotSize?: number;

  // ── D13/D14: the THIRD variant level, and part identity ─────────────────
  //
  // Three levels, three mechanisms, and only the middle one needed building:
  //   1 MODEL              a tree leaf          `category-dragoon-g`
  //   2 CATALOGUE VARIANT  facets               release × colourway × brand
  //   3 PHYSICAL UNIT      one listing each     Dragoon G "A" vs "B"
  //
  // Level 3 is what ecommerce usually means by a variant and it needed no new
  // concept, because a ProductDocument already IS one physical unit.

  /**
   * Distinguishes two physically distinct units of the SAME model and the same
   * catalogue variant — both white Dragoon G, one with a scuffed attack ring.
   *
   * 🛑 Referenced by `isLot`'s comment above since G3a and declared NOWHERE
   * until now, so the rule that comment states had no field to state it about.
   *
   * 🛑 NOT `itemCode`, which is the grading axis and documents `"PSA 10"` as
   * its example — a grade is a third party's claim about condition. A unit
   * label is a disambiguator the seller chose.
   *
   * It exists because the alternative is what the crawl measured at
   * thelimitlesscorner: one listing per physical unit with the condition
   * defects welded into the TITLE.
   */
  unitLabel?: string;

  /**
   * This listing is a complete BEY, and this is which one.
   *
   * The `beys` document id, which is also its slug and also the URL
   * (`/beys/{beyId}`) with no re-derivation — the same property that made
   * `partGlossaryId` a single id rather than a pair.
   *
   * 🛑 THE EXACT COUNTERPART OF `partGlossaryId`, and the pair is what makes
   * the seller's "single" choice meaningful: a single item is either one named
   * bey or one named part, and those are the only two things in the catalogue
   * that have an identity to point at. A lot has neither, which is why it
   * files under a non-leaf CATEGORY instead (see `isLot`).
   *
   * 🛑 Never set together with `partGlossaryId`. A listing is a whole bey or a
   * component, not both — and the two link to different reference pages, so a
   * row carrying both would render two contradictory "what is this" sections.
   */
  beyId?: string;

  /**
   * This listing is a COMPONENT, and this is which one.
   *
   * The `partGlossary` document id (`${slot}--${tail}`), stored whole.
   *
   * 🛑 A single id rather than the `{classification, code}` pair the plan
   * proposed, and the departure is deliberate: a pair is a second place the
   * key gets composed, and `partGlossaryId()` is already the one place that
   * composes it. Two composers of one key is Root Cause #75's shape, and the
   * id is also directly the URL (`/parts/{slot}/{tail}`) with no re-derivation.
   *
   * Optional even on a part listing: the glossary holds 753 rows and does not
   * cover every component ever moulded, so a spare we cannot classify is still
   * sellable and still countable.
   */
  partGlossaryId?: string;

  /**
   * What distinguishes two physical units of the same part code — "pink",
   * "translucent blue", "gold".
   *
   * 🛑 NOT a `productFeature`. That vocabulary is ~169 curated terms in 13
   * groups and `colour` is not one of them, deliberately: colourways are
   * open-ended and per-part, and pouring them into a shared vocabulary gives a
   * facet with hundreds of single-use values — the long-tail-tag anti-pattern
   * this project REJECTED when redeyemerch was crawled (50–160 tags per
   * product, 162 products on one tag).
   *
   * 🛑 Free text, and the VOCABULARY is deliberately not seeded. The corpus
   * carries part names, codes and weights and no colours at all, so a seeded
   * list would be invented. It accumulates from real spares (GAP-8: data
   * entry, not code).
   */
  colourway?: string;

  /** Mould/version variant — the "storm pegasus version" of a shared part. */
  mouldVariant?: string;

  /**
   * Built HERE from components. Each entry decremented a part listing's stock.
   *
   * 🛑 The decrement must happen in a real transaction that RE-READS, and it
   * must read `availableQuantity` rather than `stockQuantity`: a component with
   * 10 in stock and 3 reserved has SEVEN assemblable, and assembling from the
   * wrong field builds a bey out of parts somebody has already bought. The
   * PhonePe path's `runBatch` over a snapshot read outside any transaction is
   * the oversell this avoids, five components at a time.
   */
  assembledFrom?: Array<{ slotKey: string; productId: string; quantity: number }>;

  // ── D8: real view counts, with a real writer ────────────────────────────
  //
  // 🛑 These replace `viewCount`, which was `canFilter: true, canSort: true`
  // in the Sieve config with NO writer on any document — so a hand-written
  // `?sort=viewCount` returned zero rows, because a Firestore `orderBy`
  // excludes every document lacking the ordering field (Root Cause #100).
  // A5 removed the UI sort; the reachable field survived as F1 #1.
  //
  // 🛑 FLAT, not nested under `metrics`. A nested sort field needs its own
  // composite index per sort shape, and the window is the thing being ordered.
  // The names state the window, which `viewCount` never did: it read as a
  // lifetime figure while nothing maintained it.
  //
  // Written nightly by `runProductViewWindows` from the `pageViews` day
  // buckets. Absent means NOT YET ROLLED UP — not zero. The first run writes
  // every product, including the ones at 0, precisely so absence stops being
  // ambiguous.
  /** Views in the trailing 7 days. */
  views7d?: number;
  /** Views in the trailing 30 days. */
  views30d?: number;
  condition?: "new" | "like_new" | "good" | "fair" | "poor" | "used" | "refurbished" | "broken" | "graded";
  insurance?: boolean;
  insuranceCost?: number;
  shippingPaidBy?: "seller" | "buyer";
  auctionEndDate?: Date;
  startingBid?: number;
  currentBid?: number;
  bidCount?: number;
  leadingBidderId?: string;
  reservePrice?: number;
  buyNowPrice?: number;
  minBidIncrement?: number;
  autoExtendable?: boolean;
  auctionExtensionMinutes?: number;
  auctionOriginalEndDate?: Date;
  auctionShippingPaidBy?: "seller" | "winner";
  /**
   * True once anybody has bid. Written by `placeBid`, never reset.
   *
   * It no longer gates Buy Now. The original SB-UNI-H design copied eBay's rule
   * — BIN vanishes the moment the first bid lands — which in practice hid the
   * button on nearly every real auction (3 of 4 seeded BIN fixtures had it
   * hidden), while the PDP went on advertising the BIN *price* right above the
   * missing button. Availability is now `buyNowPrice > currentBid`, via
   * `isBuyNowAvailable()`; this field survives as a plain filterable fact about
   * the auction.
   *
   * (A `buyItNowPrice` field used to sit alongside this one, documented as THE
   * BIN price while every consumer actually read `buyNowPrice` above. Deleted
   * 2026-08-24 — it had no readers and had already caused one seed-data bug.)
   */
  bidsHaveStarted?: boolean;
  // SB-UNI-G 2026-05-13 — TCGPlayer-style grading + card metadata.
  // Applies to listingType:"standard" + "auction". Composite indices
  // (grading.service, grading.grade desc, createdAt desc) + (card.setName,
  // card.cardNumber, status) deployed alongside this schema add.
  grading?: ProductGrading;
  card?: ProductCardMetadata;
  // SB-UNI-I 2026-05-13 — Classified-listing fields (OLX / FB Marketplace).
  classified?: ProductClassifiedMeta;
  // SB-UNI-J 2026-05-13 — Digital-code listing fields (Steam pattern).
  digitalCode?: ProductDigitalCodeMeta;
  // SB-UNI-K 2026-05-13 — Live-item listing fields (animals / plants).
  liveItem?: ProductLiveItemMeta;
  // SB-UNI-L 2026-05-13 — Catalog/Offer split foundation slice. When set,
  // this ProductDocument is a "seller offer" linked to a shared
  // CatalogProductDocument row. The PDP aggregates all offers with the same
  // catalogProductId at /catalog/{slug}. Migration + admin "Promote to
 // catalog" flow lands in Phase 4 cohort 2.
  catalogProductId?: string;
  preOrderDeliveryDate?: Date;
  preOrderDepositPercent?: number;
  preOrderDepositAmount?: number;
  preOrderMaxQuantity?: number;
  preOrderCurrentCount?: number;
  preOrderProductionStatus?: "upcoming" | "in_production" | "ready_to_ship";
  preOrderCancellable?: boolean;
  preOrderClosed?: boolean;
  isPromoted?: boolean;
  isOnSale?: boolean;
  isSold?: boolean;
  /**
   * This listing is PRINTED OR BUILT WHEN ORDERED, so stock does not gate it.
   *
   * A per-LISTING flag, deliberately not implied by `listingType`. A seller can
   * hold a finite run of pre-cut sticker sheets and also offer a
   * print-on-demand sheet, and the two must coexist on the same type — which a
   * type-level rule cannot express. (`showsStockQuantity` on the plugin is the
   * type-level field and must NOT be repurposed for this.)
   *
   * 🛑 It bypasses the stock CHECK and never the DECREMENT. `availableQuantity`
   * going negative on a made-to-order row IS the production queue — how many
   * are owed — and `stock-restore.ts` requires the restore to mirror the
   * decrement exactly, so skipping the decrement would make a cancelled order
   * restore stock that was never taken.
   *
   * 🛑 Not snapshotted onto `CartLineMember`. A snapshot goes stale the moment
   * the flag is flipped, and every check site already holds the product
   * document — so it is derived, never copied (Root Cause #42).
   *
   * 🛑 CHECKED, not assumed: nothing auto-sets `isSold` when quantity reaches
   * zero, so a made-to-order listing does NOT destroy itself on its first
   * sale. `buildStockUpdatePayload` writes `availableQuantity` and the rule's
   * `stockDecrementExtras` and nothing else; the only two writers of
   * `isSold: true` in the whole tree are auction settlement and the auction
   * buyout, both of which are selling a unique lot and are correct to do it.
   * If a future "mark sold out automatically" feature is added, it must skip
   * made-to-order rows or every one of them dies on its first order.
   */
  madeToOrder?: boolean;
  /**
   * The `stickerSheets` document this listing was promoted from.
   *
   * Set on BOTH the parent (the whole sheet) and every child (one cut), so the
   * relationship is answerable from either end without a query — "which sheet
   * is this sticker off" and "has this sheet already been promoted" are both
   * questions the admin UI asks.
   */
  sourceStickerSheetId?: string;
  /**
   * Which cut of that sheet, by `SheetPart.ordinal`.
   *
   * 🛑 The ordinal, never an array index — `parts[]` is not guaranteed dense or
   * ordered and a re-promote rewrites it, so an index would silently point at a
   * different sticker. Absent on the parent, which is the whole sheet.
   */
  sourceStickerPartOrdinal?: number;
  /** When true, an EMI order for this product ships as soon as it's confirmed instead of waiting for every installment to be paid. Default false. */
  allowShipBeforeEmiComplete?: boolean;
  /**
   * P-8 GST — buyer-facing tax rate on this product (%).
   *
   * 🛑 `undefined` and `0` MEAN DIFFERENT THINGS. Zero is a deliberate
   * exemption (live plants and animals); undefined is "nobody has said".
   * So the test is `== null`, NEVER `input.gstRate || default`, which would
   * silently overwrite every exempt row with the default rate. And there is
   * deliberately no entry for this in `DEFAULT_PRODUCT_DATA` — a default
   * there makes `undefined` unreachable in new rows while existing rows
   * still lack it, which is the `finalSale` trap one field over.
   *
   * Written by `deriveTaxonomy` from the category's `taxCodeId`, but the
   * SCALAR is what every reader and the order-item snapshot use: a tax-code
   * edit must change future derivations, never retroactively re-rate an
   * invoice already issued.
   */
  gstRate?: 0 | 5 | 12 | 18 | 28;
  /** P-8 GST — HSN code for GST-compliant invoices. Resolved alongside `gstRate`. */
  hsnCode?: string;

  /**
   * WHO MADE IT — distinct from `condition` (how worn) and from `brand`
   * (whose marque is on it, which a reproduction has none of). The two axes
   * are independent: an original can be broken and a reproduction can be
   * mint.
   *
   * 🛑 This is BOTH a field and a feature, deliberately, and it is the only
   * place in this schema where that duplication is justified. Structurally
   * it is a classifier and belongs in the `authenticity` FeatureGroup — but
   * a feature can be OMITTED and nothing notices. A mislabelled
   * reproduction is a refund; a mislabelled counterfeit is a child handling
   * leaded metal. The enum makes the question unskippable and writes the
   * matching feature, so the facet, the badge and search all read one
   * vocabulary.
   *
   * Validated by the competitor crawl: worldhobbyshop ships a nav category
   * called "MidFake Beyblades" and an FAQ promising that authenticity and
   * condition are both disclosed per listing. Hence "Midfake" as the LABEL
   * on the reproduction tier — it is the word buyers search.
   */
  authenticity?: ProductAuthenticity;
  /** Print-specific metadata for "art" / "stickers" listings — printed-only physical goods. Optional on every listing type; only populated for art/stickers. */
  printMeta?: ProductPrintMeta;
  promotionEndDate?: Date;
  pickupAddressId?: string;
  viewCount?: number;
  avgRating?: number;
  reviewCount?: number;
  bulkDiscounts?: { quantity: number; discountPercent: number }[];
  ingredients?: string[];
  howToUse?: string[];
  allowOffers?: boolean;
  minOfferPercent?: number;
  customFields?: CustomField[];
  customSections?: CustomSection[];
  sublistingCategoryId?: string;
  groupId?: string;
  isGroupParent?: boolean;
  groupParentSlug?: string;
  groupChildSlugs?: string[];
  groupTitle?: string;
  /*
   * ── Self-assembled-selection rules, set on the GROUP PARENT ─────────────
   *
   * "Create your own bundle, with restrictions set by seller/admin". The shape,
   * the resolver and the single enforcement point all live in
   * `_internal/shared/features/products/group-rules.ts`; these are just where a
   * product group stores them. A `groupedListing` stores the same five on its
   * own document, which is why nothing reads them directly — both homes go
   * through `readGroupRules`.
   *
   * 🛑 All optional, and ABSENT MEANS UNRESTRICTED. Every group that exists
   * today has none of them, so any default that restricted something would
   * silently change what is buyable on live records.
   *
   * 🛑 These limit the SELECTION, never stock. Stock stays independent per
   * listing — no pool, no bill of materials — because a spare attack ring is
   * one object the seller happens to have.
   */
  groupMinMembers?: number;
  groupMaxMembers?: number;
  groupMaxUnitsPerMember?: number;
  groupRequiredMemberIds?: string[];
  /**
   * Percentage off a self-assembled selection's subtotal, 0–100.
   *
   * 🛑 Applied in exactly ONE place: the repository's private
   * `deriveLinePrice`, which runs on every `groupMembers` write and feeds
   * `expandCartLineToOrderRows`' per-member GST proration through
   * `allocateAcrossMembers`. A second application anywhere makes the cart total
   * disagree with the invoice (Root Cause #75).
   */
  groupDiscountPercent?: number;
  /**
   * W1-45 — optional icon shown as an overlay badge on every card whose
   * product belongs to this group. Set once on the group parent; cards
   * inherit it via the snapshot pipeline. Either an emoji or a media slug
   * (rendered via `/media/<slug>`).
   */
  groupIcon?: string;
  /**
   * W1-45 — denormalized icon from the sublisting category (`display.icon`).
   * Mirrored onto the product snapshot at create/update time so cards can
   * render it without an extra category lookup per row.
   */
  sublistingIcon?: string;

  // ── SB1 (S19 / S22 Phase 4 2026-05-12) — canonical listing-kind discriminator
  /**
   * Required since Phase 4 dropped the legacy `isAuction` / `isPreOrder`
   * booleans. Every product document carries this — queries route through
   * `where("listingType", "==", X)` against the `listingType+...` composite
   * indexes in `appkit/firebase/base/firestore.indexes.json`.
   * SB-UNI-F — extended with classified | digital-code | live.
   */
  listingType: ListingType;
  /** Hard cap on units a single user may purchase (SB1-B; bundle/prize-draw). */
  maxPerUser?: number;
  /** Reverse pointers — bundle ids that include this product. */
  partOfBundleIds?: string[];
  partOfBundleTitles?: string[];
  /** Denormalised flag — true when partOfBundleIds has at least one entry. Enables Firestore isPartOfBundle==true query. */
  isPartOfBundle?: boolean;

  // ── Procurement Shipments reverse link (Feature A) — set only by the
  // "Create pre-order link" route; read-only display on the product admin
  // edit view ("Sourced from SH-2026-0001").
  sourceShipmentId?: string;
  sourceShipmentLotId?: string;
  sourceShipmentItemId?: string;
  // ── Personal Catalogue reverse link (Feature B) — set only by the
  // list-from-catalogue / admin-approve-catalogue-listing actions.
  sourceCatalogueItemId?: string;
  sourceCatalogueOwnerId?: string;

  // ── Prize-draw fields (SB1-B). Only populated when listingType === "prize-draw".
  prizeDrawItems?: PrizeDrawItem[];
  pricePerEntry?: number;
  prizeMaxEntries?: number;
  prizeCurrentEntries?: number;
  /**
   * Draw start, set once at creation (= createdAt) — never seller-edited.
   * `prizeRevealWindowEnd` is derived from this + `prizeDrawDurationDays`.
   */
  prizeRevealWindowStart?: Date;
  /** Hard expiry — `prizeRevealWindowStart` + `prizeDrawDurationDays` days. */
  prizeRevealWindowEnd?: Date;
  /**
   * "pending" is legacy-only (no longer written by new listings — reveal is
   * fully automatic, there's no seller-facing delayed-start concept anymore —
   * draft→published is how a seller holds a draw back). New listings go
   * straight to "open", flipping to "closed" once every eligible order has
   * been revealed.
   */
  prizeRevealStatus?: "pending" | "open" | "closed";
  /**
   * Seller-facing duration input, 1–15 days (PRIZE_DRAW_DURATION_DAYS_MIN/MAX
   * in checkout/rules/_limits.ts). Drives `prizeRevealWindowEnd` at creation.
   */
  prizeDrawDurationDays?: number;
  /** Public proof-of-fairness file (commit-reveal scheme). */
  prizeGithubFileUrl?: string;
  /**
   * Draw mode for prize-draw listings.
   * "reveal" = classic automatic-reveal flow (default, backward-compat).
   * "lottery" = user self-pull with weighted random slot assignment.
   */
  prizeDrawMode?: "reveal" | "lottery";
  /**
   * Reveal trigger for "reveal" mode draws (irrelevant for "lottery" mode).
   * "instant" — winner assigned the moment the order's payment is confirmed.
   * "scheduled" — winner assigned automatically at whichever comes first:
   * `prizeRevealWindowEnd` or full sellout (`prizeCurrentEntries === prizeMaxEntries`).
   */
  prizeRevealMode?: "instant" | "scheduled";
  /**
   * Full lottery config. Only set when prizeDrawMode === "lottery".
   * Includes server-only price/weight fields — stripped by adapter before any client response.
   */
  lotteryConfig?: LotteryConfig;

  // ── Per-product shipping overrides (S-SBUNI-RULES 2026-05-13) ───────────
  /**
   * Optional per-item shipping constraints. When absent the store's
   * shippingConfig applies unchanged.
   */
  shipping?: {
    /**
     * Restrict this item to a subset of the store's providers
     * (e.g. heavy item not eligible for store-pickup).
     */
    allowedProviderIds?: string[];
    /**
     * Per-provider fee / ETA overrides for this item (e.g. oversized surcharge).
     * Merged on top of the provider's store-wide config when displaying the
     * ShippingPicker.
     */
    overrides?: Array<{
      providerId: string;
      fee?: number;
      etaDaysMin?: number;
      etaDaysMax?: number;
    }>;
  };

  /**
   * The PACKED parcel — C5a. Optional on purpose.
   *
   * 🛑 The figure a carrier bills on is the packed box, not the item: a bey is
   * ~30 g and ~300 g boxed. A REQUIRED product weight would therefore be an
   * item weight that systematically under-estimates every booking — and
   * because a booking is capped at the amount collected from the buyer,
   * systematic under-estimation means silently absorbing the difference on
   * every order.
   *
   * So three tiers: the category's packed default drives the checkout
   * estimate, this refines it when a seller has actually weighed a box, and
   * the real figure is entered at shipment time. See
   * `_internal/shared/features/shipping/parcel.ts`.
   *
   * `dimensionsCm` is all three or nothing — a box with a length and no width
   * is not a dimension, and a volumetric calculation fed two of three yields a
   * quote for a flat sheet.
   */
  weightG?: number;
  dimensionsCm?: { l: number; w: number; h: number };

  /**
   * @deprecated Free-text storage location. Superseded by `inventoryPlacements`.
   *
   * 🛑 READ-ONLY FROM 2026-10-21. Three uncontrolled text inputs with no
   * registry behind them, so "shelf 3", "Shelf-3" and "AC60 3" all meant one
   * place: no list could group them, no query could find everything on a
   * shelf, and the label printed whichever spelling that one product carried.
   * Three boxes a human types into cannot be made consistent by validation.
   *
   * Where something lives is now a PLACEMENT (`storageBoxes` +
   * `inventoryPlacements`), which carries a quantity and permits one product
   * in two boxes — neither expressible here.
   *
   * 🛑 NOT DELETED, AND THE REASON IS NOT TIMIDITY. The stored strings cannot
   * be mechanically mapped to box codes — that impossibility is exactly why
   * the registry exists — so an automatic migration would either invent boxes
   * from free text or lose the data. Listings that carry a value still show it
   * (the product form and the label both do) until a human has re-placed them
   * in a real box. The inputs are gone, so nothing new accumulates;
   * `audit-no-physical-location-input` keeps it that way, and the field goes
   * when the last value does.
   */
  physicalLocation?: {
    zone: string;
    shelf: string;
    bin: string;
  };

  /** Scannable barcode identifier linking this listing to a physical stickered item.
   *  Auto-generated as `LIR-{8-char-hex}` on product creation when not supplied.
   *  Override by scanning a pre-printed sticker during the create/edit flow.
   *
   *  🛑 THE MACHINE KEY, and it must stay uniform-width. This field used to
   *  hold the semantic codes too — 23 seeded products carried
   *  `LIR-BEY-X-005` while everything app-created carried the SHA-1 form, so
   *  the audit found both printed in one list. Those moved to `sku`; see the
   *  note above `generateBarcodeId` for why the widths cannot share a field.
   */
  barcodeId?: string;

  /**
   * The HUMAN key — a stock-keeping unit a person reads, says aloud and files
   * by. `LIR-BURS-K3F9P` from `generateSku`, or whatever the seller authored.
   *
   * 🛑 Distinct from `barcodeId` ON PURPOSE, and the pair is the whole
   * reconciliation of the audit's two-barcode finding. A barcode is scanned
   * and must be fixed-width for a label to fit; a SKU is spoken and must be
   * meaningful. One field could not be both, and was not.
   *
   * Optional, and absent on most live rows until the backfill runs
   * (`appkit/scripts/backfill-sku.mjs`). 🛑 Nothing may assume its presence:
   * the admin toolbar advertised SKU search for a field that did not exist at
   * all, and every row read "No SKU" as a result.
   */
  sku?: string;

  /** Normalized edge-n-gram search field. Replaced `searchTokens`. */
  searchTxt?: string[];
}

/**
 * Single prize within a prize-draw listing. A draw can have between 3 and 16
 * prizes; each is revealed in `itemNumber` order during the reveal window.
 * `isWon` flips to `true` when the draw assigns this prize to a participant.
 */
export interface PrizeDrawItem {
  itemNumber: number;
  title: string;
  description?: string;
  images: string[];
  video?: { url: string; thumbnailUrl?: string };
  condition: string;
  estimatedValue?: number;
  // FUTURE_FINANCIAL_DB: external_tx_id → lottery_transactions.external_tx_id
  /** Per-slot price in decimal rupees for lottery mode. Lower price = higher weight = higher chance. */
  prizeSlotPrice?: number;
  isWon: boolean;
  /** Order id this item was assigned to — set alongside isWon:true. Admin/seller-only mapping (never public) so the seller knows which physical item ships to which order. */
  wonByOrderId?: string;
}

/** Runtime-accessible product status values — use instead of bare string literals. */
export const ProductStatusValues = {
  DRAFT: "draft",
  PUBLISHED: "published",
  IN_REVIEW: "in_review",
  ARCHIVED: "archived",
} as const satisfies Record<string, ProductStatus>;

export const PRODUCT_COLLECTION = "products" as const;

export const PRODUCT_INDEXED_FIELDS = [
  "storeId",
  "status",
  "category",
  /* Indexed: `array-contains` on the ASSIGNED list is what the category
   * delete cascade queries to find a product filed here as its SECOND
   * category — `findBy("category", id)` sees only the default leaf. */
  "categoryIds",
  "featured",
  "listingType",
  "isPromoted",
  "isOnSale",
  "isSold",
  "searchTxt",
  "createdAt",
  "barcodeId",
  /*
   * The warehouse location — C4.
   *
   * 🛑 A single-field entry, deliberately, and the distinction matters.
   * Firestore indexes single fields automatically, so this list is
   * documentation of what the collection is QUERIED by rather than the
   * mechanism — and the real answer for location is `searchTxt`, which is
   * already here. Listing the nested paths records that they are now a
   * supported query shape (the Sieve config accepts them), so the next person
   * adding a composite sees them rather than discovering a dropped clause.
   *
   * `physicalLocation.zone` is the only part worth naming: a zone is the
   * coarse bucket a dashboard groups by, while shelf and bin are what search
   * resolves. Naming all three would imply three query shapes exist when one
   * does.
   */
  "physicalLocation.zone",
] as const;

export const DEFAULT_PRODUCT_DATA: Partial<ProductDocument> = {
  status: "draft",
  featured: false,
  images: [],
  tags: [],
  availableQuantity: 0,
  // SB1-G Phase 4 — listingType is the canonical discriminator. Defaults to
  // "standard"; the editor flips it when the seller chooses auction or pre-order.
  listingType: "standard",
  isPromoted: false,
  isOnSale: false,
  isSold: false,
  bidCount: 0,
  condition: "new",
  insurance: false,
  shippingPaidBy: "buyer",
  autoExtendable: false,
  auctionExtensionMinutes: 5,
  auctionShippingPaidBy: "winner",
};

export const PRODUCT_PUBLIC_FIELDS = [
  // Public-facing offer signals: the card grid renders a "Taking Offers" pill
  // from `allowOffers`, and the detail-page form seeds its minimum from
  // `minOfferPercent`. Listed here prophylactically — this array currently has
  // no consumers, so their absence was not a live bug, but it would become one
  // the moment something starts projecting through it.
  "allowOffers",
  "minOfferPercent",
  "id",
  "title",
  "description",
  "category",
  /* Public: the chips on a detail page render the assignments. */
  "categoryIds",
  "categoryIdNames",
  "subcategory",
  "brand",
  "price",
  /*
   * The strike-through "was ₹X". Public because that is the only place it
   * means anything — `GatedPrice` renders it as `originalAmount` and derives
   * the discount % from it, inside the guest gate, so it is published on
   * exactly the same terms as `price` itself.
   */
  "originalPrice",
  "currency",
  "stockQuantity",
  "availableQuantity",
  "images",
  "status",
  "storeName",
  "featured",
  "tags",
  "specifications",
  "features",
  "shippingInfo",
  "returnPolicy",
  // Buyer-facing: drives the "Final Sale" card pill and the detail-page
  // Delivery & Returns line. Absent means final sale — read via isFinalSale().
  "finalSale",
  // Buyer-facing by necessity: "lot of 12" is the single most important thing
  // about a lot listing, and a buyer who cannot see it thinks they are bidding
  // on one item.
  "isLot",
  "lotSize",
  /* D13/D14 — buyer-facing by definition: a colourway is WHY someone buys that
   * particular spare, and a unit label is how they tell two identical listings
   * apart. `assembledFrom` is listed too — it names product ids that are
   * already public listings, and "built from these parts" is provenance a
   * buyer should see. */
  "unitLabel",
  "partGlossaryId",
  "colourway",
  "mouldVariant",
  "assembledFrom",
  /* D8 — public because "N people viewed this this week" is the honest social
   * proof H2 is built on, and it is a figure we measured. 🛑 Deliberately NOT
   * in PRODUCT_UPDATABLE_FIELDS: a seller who could write their own view count
   * turns a measurement into a claim. */
  "views7d",
  "views30d",
  /* 🛑 D13/D14. Listed here or an update STRIPS them: the write schema has no
   * `.passthrough()`, so a field absent from this list is dropped before it
   * reaches Firestore while the write still returns 200 (Root Cause #101). */
  "unitLabel",
  "partGlossaryId",
  "colourway",
  "mouldVariant",
  "assembledFrom",
  "listingType",
  "auctionEndDate",
  "startingBid",
  "currentBid",
  "bidCount",
  "reservePrice",
  "buyNowPrice",
  "minBidIncrement",
  "autoExtendable",
  "auctionExtensionMinutes",
  "auctionShippingPaidBy",
  // SB-UNI-H 2026-05-13 — eBay hybrid BIN.
  "bidsHaveStarted",
  // SB-UNI-G 2026-05-13 — TCGPlayer grading + card metadata.
  "grading",
  "card",
  // SB-UNI-I / J / K 2026-05-13 — per-type field blocks.
  "classified",
  "digitalCode",
  "liveItem",
  // SB-UNI-L 2026-05-13 — catalog link (offer-side reference).
  "catalogProductId",
  "preOrderDeliveryDate",
  "preOrderDepositPercent",
  "preOrderDepositAmount",
  "preOrderMaxQuantity",
  "preOrderCurrentCount",
  "preOrderProductionStatus",
  "preOrderCancellable",
  "condition",
  "insurance",
  "insuranceCost",
  "shippingPaidBy",
  "isPromoted",
  "isOnSale",
  "isSold",
  /* Public because the PDP has to SAY "made to order, printed when you order"
   * instead of a stock line, and the group picker has to uncap that member's
   * stepper. Both are client-side reads. */
  "madeToOrder",
  /* Public: provenance a buyer should see — "this is one cut off that sheet" —
   * and neither value is a path or a private id. The sheet document itself is
   * admin-only; this is just its id, same shape as `sourceCatalogueItemId`. */
  "sourceStickerSheetId",
  "sourceStickerPartOrdinal",
  "slug",
  "seoTitle",
  "seoDescription",
  "seoKeywords",
  "viewCount",
  "customFields",
  "customSections",
  "sublistingCategoryId",
  "groupId",
  "isGroupParent",
  "groupParentSlug",
  "groupChildSlugs",
  "groupTitle",
  /* The group's own rules. Public because the PICKER enforces them too — a
   * server-only rule reads as a broken button — and none of them is sensitive:
   * they are merchandising limits a buyer is about to be told anyway. */
  "groupMinMembers",
  "groupMaxMembers",
  "groupMaxUnitsPerMember",
  "groupRequiredMemberIds",
  "groupDiscountPercent",
  "createdAt",
] as const;

export const PRODUCT_UPDATABLE_FIELDS = [
  "title",
  "description",
  "category",
  /* I1 — the ASSIGNED list. 🛑 Named here or an update STRIPS it while still
   * returning 200 (Root Cause #101), which is exactly how a UI-created
   * product lost its chain. `categorySlugs`/`categoryNames` stay OUT: they
   * are derived, and a caller that could set them could desync the closure
   * from the assignments it is supposed to be the closure OF. */
  "categoryIds",
  "subcategory",
  "brand",
  "price",
  /* The strike-through "was" price — see the declaration on ProductDocument
   * for why it is this name and not `compareAtPrice` (F1 #25). */
  "originalPrice",
  "stockQuantity",
  "images",
  "status",
  "tags",
  "specifications",
  "features",
  "shippingInfo",
  "returnPolicy",
  "finalSale",
  /* 🛑 Listed here or an update STRIPS them. The write schema has no
   * `.passthrough()`, so a field absent from this list is dropped before it
   * reaches Firestore while the write still returns 200 — exactly how a
   * UI-created product lost its `categorySlugs` chain (Root Cause #101) and how
   * the strike-through price was silently discarded until F1 #25 was closed —
   * the form wrote `compareAtPrice`, nothing declared it, and `originalPrice`
   * (which both renderers read) was not in this list either. */
  "isLot",
  "lotSize",
  /*
   * 🛑 `physicalLocation` WAS MISSING, and the comment five lines above
   * describes the identical defect one field over: "the form wrote
   * `compareAtPrice`, nothing declared it, and `originalPrice` was not in
   * this list either".
   *
   * `ProductForm` renders three inputs for it — zone, shelf, bin. They
   * accept typing, they parse, and the repository dropped the whole object
   * on every save, so 0 of the catalogue's products carry one. The field is
   * declared on `ProductDocument`, and `physicalLocation.zone` is even in
   * the searchable-field list, so everything existed except the one entry
   * that lets a write through.
   *
   * Added rather than removing the inputs. Phase 5 of the current plan
   * retires this field in favour of a box registry with a move ledger, and
   * until that lands a working field is better than three inputs that lie —
   * a seller who labels a shelf today should find it there tomorrow.
   */
  "physicalLocation",
  // The human stock key. Seller-authored or generated; see ProductDocument.sku.
  "sku",
  "pickupAddressId",
  "condition",
  "insurance",
  "shippingPaidBy",
  "autoExtendable",
  "auctionExtensionMinutes",
  "auctionShippingPaidBy",
  "reservePrice",
  "buyNowPrice",
  "minBidIncrement",
  // SB-UNI-H 2026-05-13 — eBay hybrid BIN updatable.
  "bidsHaveStarted",
  // SB-UNI-G 2026-05-13 — TCGPlayer grading + card metadata updatable.
  "grading",
  "card",
  // SB-UNI-I / J / K 2026-05-13 — per-type field blocks updatable.
  "classified",
  "digitalCode",
  "liveItem",
  // SB-UNI-L 2026-05-13 — catalog link updatable.
  "catalogProductId",
  "listingType",
  "preOrderDeliveryDate",
  "preOrderDepositPercent",
  "preOrderDepositAmount",
  "preOrderMaxQuantity",
  "preOrderProductionStatus",
  "preOrderCancellable",
  "isOnSale",
  "isSold",
  /* 🛑 Listed here or an update STRIPS it — the write schema has no
   * `.passthrough()`, so a field absent from this list is dropped before it
   * reaches Firestore while the write still returns 200 (Root Cause #101). The
   * seller checkbox would appear to save and change nothing. */
  "madeToOrder",
  /* Updatable so `promoteStickerSheetToListings` can set them through the same
   * `create`/`update` path every other write uses — and so a re-promote can
   * correct them — rather than needing a raw collection write that would also
   * skip `deriveTaxonomy`. */
  "sourceStickerSheetId",
  "sourceStickerPartOrdinal",
  "allowShipBeforeEmiComplete",
  /*
   * B3 — these three were MISSING, so the fields existed on the document
   * and were not type-legal to update: ProductUpdateInput is derived from
   * this list, so an admin or seller form could accept a GST rate and the
   * repository would refuse to write it.
   */
  "gstRate",
  "hsnCode",
  "authenticity",
  "printMeta",
  "seoTitle",
  "seoDescription",
  "seoKeywords",
  "customFields",
  "customSections",
  "sublistingCategoryId",
  "groupId",
  "isGroupParent",
  "groupParentSlug",
  "groupChildSlugs",
  "groupTitle",
  /* The group's own rules. Public because the PICKER enforces them too — a
   * server-only rule reads as a broken button — and none of them is sensitive:
   * they are merchandising limits a buyer is about to be told anyway. */
  "groupMinMembers",
  "groupMaxMembers",
  "groupMaxUnitsPerMember",
  "groupRequiredMemberIds",
  "groupDiscountPercent",
  "barcodeId",
] as const;

export type ProductCreateInput = Omit<
  ProductDocument,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "availableQuantity"
  | "bidCount"
  | "currentBid"
  | "auctionOriginalEndDate"
>;

export type ProductUpdateInput = Partial<
  Pick<ProductDocument, (typeof PRODUCT_UPDATABLE_FIELDS)[number]>
>;

export type ProductAdminUpdateInput = Partial<
  Omit<ProductDocument, "id" | "createdAt">
>;

// ── SB-UNI-N 2026-05-15 — Digital-code pool subcollection ───────────────────
// Codes live at `products/{productId}/codes/{codeId}` — seller-only write,
// buyer reads exactly the one record assigned to their order via the reveal API.
export const PRODUCT_CODES_SUBCOLLECTION = "codes" as const;

export type ProductCodeStatus = "available" | "claimed" | "revoked";

/**
 * What the buyer actually receives. A "digital code" listing delivers digital
 * CONTENT — a redemption string is only the commonest shape of it.
 *
 * `"code"` is the default and is what every pre-existing document is, so no
 * migration is needed and no existing listing changes behaviour.
 */
export type ProductCodeContentKind = "code" | "image" | "file";

export interface ProductCodeDocument extends BaseDocument {
  productId: string;
  /**
   * The redemption string. Required for `contentKind: "code"`, empty for the
   * asset kinds — a QR is not a string.
   */
  code: string;
  /** Defaults to `"code"` when absent. */
  contentKind?: ProductCodeContentKind;
  /**
   * 🛑 A RAW FIREBASE STORAGE PATH, NEVER a `/media/{slug}` URL, and never a
   * signed URL.
   *
   * Two facts make this load-bearing:
   *   - `storage.rules` is `allow read: if true` for every object in the
   *     bucket, and
   *   - `GET /api/media/[...slug]` applies NO authentication at all — it is a
   *     bare exported handler with no session read, by design, because it
   *     exists to serve public product photos through a watermarker.
   *
   * So anything reachable at a `/media/` slug is world-readable, and image
   * filenames in this codebase are content-derived and therefore guessable.
   * Putting a paid QR there would publish it. Instead the bytes are streamed by
   * `GET /api/orders/{orderId}/code/asset`, which re-checks that the caller
   * owns the order — the same shape as the invoice route, the one existing
   * precedent for a gated download here.
   */
  assetPath?: string;
  /** Original upload name, used for the `Content-Disposition` filename. */
  fileName?: string;
  /** Verified by magic bytes at upload, replayed as the response Content-Type. */
  contentType?: string;
  status: ProductCodeStatus;
  orderId?: string;
  claimedByUserId?: string;
  claimedAt?: Date;
  expiresAt?: Date;
}

export const productQueryHelpers = {
  byStore: (storeId: string) => ["storeId", "==", storeId] as const,
  byStatus: (status: ProductStatus) => ["status", "==", status] as const,
  byCategory: (category: string) => ["category", "==", category] as const,
  featured: () => ["featured", "==", true] as const,
  published: () => ["status", "==", "published"] as const,
  available: () => ["availableQuantity", ">", 0] as const,
  auctions: () => ["listingType", "==", "auction"] as const,
  preOrders: () => ["listingType", "==", "pre-order"] as const,
  prizeDraws: () => ["listingType", "==", "prize-draw"] as const,
  standardListings: () => ["listingType", "==", "standard"] as const,
  // SB-UNI-F 2026-05-13 — Phase 2 query helpers.
  classifieds: () => ["listingType", "==", "classified"] as const,
  digitalCodes: () => ["listingType", "==", "digital-code"] as const,
  liveItems: () => ["listingType", "==", "live"] as const,
  promoted: () => ["isPromoted", "==", true] as const,
  activeAuction: (date: Date) => ["auctionEndDate", ">=", date] as const,
} as const;

export function createProductId(
  input: Omit<GenerateProductIdInput, "count"> & { count?: number },
): string {
  return generateProductId(input as GenerateProductIdInput);
}

export function createAuctionId(
  input: Omit<GenerateAuctionIdInput, "count"> & { count?: number },
): string {
  return generateAuctionId(input as GenerateAuctionIdInput);
}

export function createPreOrderId(
  input: Omit<GeneratePreOrderIdInput, "count"> & { count?: number },
): string {
  return generatePreOrderId(input as GeneratePreOrderIdInput);
}
