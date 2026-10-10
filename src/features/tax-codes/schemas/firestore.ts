/**
 * Tax codes — Firestore schema
 *
 * An HSN code and its GST rate, as an ENTITY rather than two fields repeated
 * across every category. Changing a rate becomes one edit instead of ~330.
 *
 * ## 🛑 The reference is for AUTHORING. The scalars stay for CORRECTNESS.
 *
 * `CategoryProductDefaults.taxCodeId` points here, and `deriveTaxonomy`
 * resolves it to `ProductDocument.gstRate` / `.hsnCode` **on the product**;
 * the order item then snapshots from the product, exactly as it already does.
 *
 * That layering is not redundancy. Without it, editing a tax code would
 * retroactively change the GST on orders already invoiced — a compliance
 * problem, not a modelling preference. It is the same reason
 * `OrderDocumentItem` already snapshots `hsnCode`/`gstRate`.
 *
 *   a category edit  -> changes future listings
 *   a tax-code edit  -> changes future derivations
 *   nothing          -> rewrites a past sale
 *
 * ## Why this exists at all
 *
 * GST has never been charged on goods here. Recorded in our own source
 * (`_internal/server/features/checkout/actions.ts`): *"0 of 40 live orders had
 * a `gstAmount`, and the order page's Tax row had never rendered."* And
 * `gstRate` is set on zero of the current products.
 *
 * id === slug, prefix "tax-".
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";

export const TAX_CODES_COLLECTION = "taxCodes" as const;
export const TAX_CODE_PREFIX = "tax-" as const;

/**
 * The GST slabs. A closed union because a rate outside it is a data error, not
 * a new option — and because `ProductDocument.gstRate` already declares this
 * exact set, so a wider type here would not survive the derivation.
 */
export type GstRate = 0 | 5 | 12 | 18 | 28;

export const GST_RATE_VALUES = [0, 5, 12, 18, 28] as const satisfies readonly GstRate[];

/**
 * HSN chapters this catalogue touches.
 *
 * 🛑 Only **9503** is verified. 4911 (printed cards/stickers/posters) and 9504
 * (playing cards, board games) are the correct chapters for that merchandise
 * and their CURRENT RATES ARE NOT CONFIRMED — the toys rates themselves moved
 * in the 2025 revision. Verify before seeding a rate against either, because a
 * wrong HSN on a real invoice is worse than an absent one.
 */
export type HsnChapter = "9503" | "4911" | "9504" | "exempt";

/*
 * Extends `BaseDocument` (id + createdAt + updatedAt) rather than declaring
 * them — `audit-schema-base-fields` is strict-zero with no suppression
 * marker, and it exists to stop field-list drift across 23 schema files.
 * The id is `tax-hsn-95030020`, or `tax-exempt-0`; id === slug.
 */
export interface TaxCodeDocument extends BaseDocument {
  /** 4, 6 or 8 digits. Empty for the exemption row, which has no HSN. */
  hsnCode: string;
  /** Picker label, e.g. "Toys, non-electronic (HSN 9503 0020) — 5%". */
  label: string;
  description?: string;
  gstRate: GstRate;
  /** Groups the picker. ~10 rows today, more once 4911/9504 are verified. */
  chapter?: HsnChapter;
  /**
   * When the CURRENT rate took effect. Informational — it does NOT rewrite
   * history, because history lives in the per-product and per-order-item
   * snapshots. Recorded so an admin can tell a rate that has always been 5%
   * from one that changed.
   */
  effectiveFrom?: Date;
  isActive: boolean;
  /** Why this rate, and what it covers — the thing a future admin will want. */
  notes?: string;
}

export type TaxCodeCreateInput = Omit<
  TaxCodeDocument,
  "id" | "createdAt" | "updatedAt"
>;

export const TAX_CODE_UPDATABLE_FIELDS = [
  "hsnCode",
  "label",
  "description",
  "gstRate",
  "chapter",
  "effectiveFrom",
  "isActive",
  "notes",
] as const;

export type TaxCodeUpdateInput = Partial<
  Pick<TaxCodeDocument, (typeof TAX_CODE_UPDATABLE_FIELDS)[number]>
>;

export const TAX_CODE_FIELDS = {
  ID: "id",
  HSN_CODE: "hsnCode",
  LABEL: "label",
  GST_RATE: "gstRate",
  CHAPTER: "chapter",
  IS_ACTIVE: "isActive",
  EFFECTIVE_FROM: "effectiveFrom",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;

export const TAX_CODE_SIEVE_FIELDS = {
  label: { canFilter: true, canSort: true },
  hsnCode: { canFilter: true, canSort: true },
  gstRate: { canFilter: true, canSort: true },
  chapter: { canFilter: true, canSort: false },
  isActive: { canFilter: true, canSort: false },
  createdAt: { canFilter: false, canSort: true },
} as const;

/**
 * Derive the document id from the HSN code.
 *
 * Deterministic, so a seed run is idempotent (Root Cause #25) and so the same
 * HSN cannot be entered twice under two ids — which would give two rows one
 * admin edits and the other serves.
 */
export function createTaxCodeId(hsnCode: string): string {
  const digits = hsnCode.replace(/\D/g, "");
  return digits ? `${TAX_CODE_PREFIX}hsn-${digits}` : `${TAX_CODE_PREFIX}exempt-0`;
}

/**
 * India's HSN codes are 4, 6 or 8 digits. Checked rather than trusted because
 * the inline-create path in the seller form reaches the same route as the
 * admin editor, and a malformed code propagates onto every product derived
 * from the category that points at it.
 */
export function isValidHsnCode(hsnCode: string): boolean {
  return /^(\d{4}|\d{6}|\d{8})$/.test(hsnCode.trim());
}
