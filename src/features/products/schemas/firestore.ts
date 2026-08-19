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
import type { ProductStatus, ListingType } from "../types";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { LotteryConfig } from "../../lottery/types";

export interface ProductVideoField {
  url: string;
  thumbnailUrl: string;
  duration: number;
  trimStart?: number;
  trimEnd?: number;
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
// Add-to-cart is rejected at the capability layer; the PDP CTA routes to
// `conversations` chat with product context attached.
export interface ProductClassifiedMeta {
  /** Where the item is — drives the (listingType, classified.meetupArea.city, createdAt) index. */
  meetupArea: {
    city: string;
    locality?: string;
    pincode?: string;
  };
  /** How the buyer reaches the seller (chat | phone | both). */
  contactMethod?: "chat" | "phone" | "both";
  /** Seller offers shipping in addition to meetup. */
  acceptsShipping?: boolean;
  /** Price is negotiable — UI hints "₹X (negotiable)". */
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

export interface ProductDocument extends BaseDocument {
  title: string;
  description: string;
  slug?: string;

  /** Tester sandbox flag — set on shared admin-seeded test products; swept by testerSandboxCleanup. */
  isTestData?: boolean;
  /** When isTestData, the cutoff after which testerSandboxCleanup deletes this doc (cascades to bids). */
  testDataExpiresAt?: Date;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  /** Primary category FK slugs (1-to-many). Use categorySlugs[0] for display. */
  categorySlugs: string[];
  /** Display-name cache parallel to categorySlugs[]. */
  categoryNames?: string[];
  /** @deprecated Read-only alias — normalised from legacy docs on load. */
  category?: string;
  /** @deprecated Read-only alias. */
  categoryName?: string;
  subcategory?: string;
  brand?: string;
  brandSlug?: string;
  price: number;
  currency: string;
  stockQuantity: number;
  availableQuantity: number;
  mainImage: string;
  images: string[];
  video?: ProductVideoField;
  status: ProductStatus;
  storeId: string;
  storeName?: string;
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
  // SB-UNI-H 2026-05-13 — eBay-style hybrid auction + Buy It Now.
  // BIN is offered while the auction has zero bids; once `bidsHaveStarted`
  // flips to true the PDP hides the BIN button per eBay rules. Sellers
  // can leave `buyItNowPrice` unset to disable BIN entirely.
  buyItNowPrice?: number;
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
  /** When true, an EMI order for this product ships as soon as it's confirmed instead of waiting for every installment to be paid. Default false. */
  allowShipBeforeEmiComplete?: boolean;
  /** P-8 GST — buyer-facing tax rate on this product (%). Unset/0 = exempt. */
  gstRate?: 0 | 5 | 12 | 18 | 28;
  /** P-8 GST — Harmonized System of Nomenclature code for GST-compliant invoices. */
  hsnCode?: string;
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

  /** Physical storage location for inventory management (Print & Label Center). */
  physicalLocation?: {
    zone: string;
    shelf: string;
    bin: string;
  };

  /** Scannable barcode identifier linking this listing to a physical stickered item.
   *  Auto-generated as `LIR-{8-char-hex}` on product creation when not supplied.
   *  Override by scanning a pre-printed sticker during the create/edit flow. */
  barcodeId?: string;

  searchTokens?: string[];
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
  "featured",
  "listingType",
  "isPromoted",
  "isOnSale",
  "isSold",
  "searchTokens",
  "createdAt",
  "barcodeId",
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
  "id",
  "title",
  "description",
  "category",
  "subcategory",
  "brand",
  "price",
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
  "buyItNowPrice",
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
  "createdAt",
] as const;

export const PRODUCT_UPDATABLE_FIELDS = [
  "title",
  "description",
  "category",
  "subcategory",
  "brand",
  "price",
  "stockQuantity",
  "images",
  "status",
  "tags",
  "specifications",
  "features",
  "shippingInfo",
  "returnPolicy",
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
  "buyItNowPrice",
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
  "allowShipBeforeEmiComplete",
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

export interface ProductCodeDocument extends BaseDocument {
  productId: string;
  code: string;
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
