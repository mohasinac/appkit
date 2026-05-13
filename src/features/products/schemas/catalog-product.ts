/**
 * Catalog Product schema — SB-UNI-L Phase 4 foundation slice 2026-05-13.
 *
 * Splits the per-seller `ProductDocument` (now `SellerOfferDocument` in
 * spirit — see the optional `catalogProductId` link added in firestore.ts)
 * out from a shared catalog row that aggregates N offers for the same SKU.
 *
 * Two modes per offer:
 *   1. catalog-linked — `SellerOffer.catalogProductId` points at a
 *      `CatalogProductDocument`. The PDP at `/catalog/{slug}` aggregates
 *      every offer linked to the catalog row; sellers compete on price/
 *      condition. Used for graded cards, sealed boxes, mass-produced toys.
 *   2. standalone — `catalogProductId` is undefined. PDP renders at
 *      `/products/{slug}` (the current path). Used for one-of-a-kind items
 *      (custom dioramas, signed memorabilia, prototypes).
 *
 * The full PDP routing + admin "Promote to catalog" workflow lands in the
 * Phase 4 second cohort. This file is the schema foundation — types, slug
 * prefix, capability flag — so consumers can start writing against the
 * shape today.
 */

import type { GradingService, ProductCardMetadata } from "./firestore";

/** Identifier types attached to a catalog row for SKU-level deduplication. */
export interface CatalogIdentifiers {
  /** Industry standard SKU. */
  gtin?: string;
  /** Manufacturer part number. */
  mpn?: string;
  /** Internal catalog id (e.g. TCGPlayer product id). */
  externalId?: string;
}

/**
 * Top-level catalog row. One per SKU; offers link via `catalogProductId`.
 *
 * Slug prefix: `catalog-{slug}` (added to CLAUDE.md table by this commit).
 */
export interface CatalogProductDocument {
  id: string;
  slug: string;
  title: string;
  description?: string;
  brandSlug?: string;
  categorySlug?: string;
  /** Card metadata reused from the per-offer schema for indexing parity. */
  card?: ProductCardMetadata;
  /** Optional grading service if the catalog row tracks slabs. */
  gradingService?: GradingService;
  /** Canonical images shared by all linked offers. */
  images: string[];
  /** Catalog-level identifiers (GTIN / MPN / external). */
  identifiers?: CatalogIdentifiers;
  /** Denormalised — count of active offers linking to this catalog row. */
  offerCount: number;
  /** Denormalised — minimum priceInPaise across active linked offers. */
  minOfferPriceInPaise?: number;
  /** Catalog is searchable / showable on `/catalog/{slug}`. */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Admin who promoted this catalog from an offer (audit trail). */
  promotedBy?: string;
}

export const CATALOG_COLLECTION = "catalogProducts" as const;

export const CATALOG_PUBLIC_FIELDS = [
  "id",
  "slug",
  "title",
  "description",
  "brandSlug",
  "categorySlug",
  "card",
  "gradingService",
  "images",
  "identifiers",
  "offerCount",
  "minOfferPriceInPaise",
  "isActive",
  "createdAt",
  "updatedAt",
] as const;

export const CATALOG_UPDATABLE_FIELDS = [
  "title",
  "description",
  "brandSlug",
  "categorySlug",
  "card",
  "gradingService",
  "images",
  "identifiers",
  "isActive",
] as const;

export type CatalogProductCreateInput = Omit<
  CatalogProductDocument,
  "id" | "createdAt" | "updatedAt" | "offerCount" | "minOfferPriceInPaise"
> & {
  offerCount?: number;
  minOfferPriceInPaise?: number;
};

export type CatalogProductUpdateInput = Partial<
  Pick<CatalogProductDocument, (typeof CATALOG_UPDATABLE_FIELDS)[number]>
>;
