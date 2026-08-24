/*
 * WHY: There was no single definition of "this listing is still available".
 *      The closest thing was a private `isValidRelatedItem()` in
 *      `_internal/server/features/products/data.ts`, reachable only from the
 *      related-items carousel and carrying three bugs: it read
 *      `row.codesAvailable` at the top level when the schema nests it under
 *      `digitalCode.codesAvailable`; it filtered on `status` values
 *      ("sold", "out_of_stock", "discontinued") that are not members of the
 *      real `ProductStatus` union; and it had no branch for classified / live
 *      / art / stickers. Meanwhile the listing pages expressed the same idea a
 *      fourth way (an `inStock` boolean plus a `dateFrom` cutoff) and the
 *      homepage expressed it not at all — which is why the "Live Auctions"
 *      strip rendered the most-expired lots first.
 *
 * WHAT: The type-agnostic half of the availability predicate. The per-type
 *       half lives on each listing-type plugin as `isAvailable`; the two are
 *       combined by `isListingRowAvailable()` in `./_registry`.
 *
 * EXPORTS: AvailabilityRow, UnavailableClause, toDate, num, baseAvailable,
 *          isPubliclyVisible, alwaysAvailable, STOCK_ONLY_UNAVAILABLE_CLAUSES
 *
 * @tag domain:products
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:_registry,list-public,data,PrizeDrawsSection
 * @tag sideEffects:none
 */

import { PRODUCT_FIELDS } from "../../../constants/field-names";
import type { FirestoreValue } from "../../../schemas/types";

/**
 * A product row as it reaches a predicate.
 *
 * Deliberately the project’s sanctioned loose Firestore-row alias rather than
 * `ProductDocument`: the same row arrives here in three shapes — a Firestore
 * document (Date / Timestamp fields), an already-serialised payload from the
 * colocated `listingProcessor` Function (ISO strings), and JSON from
 * `/api/products`. Narrowing to any one of them would just push a cast to
 * every call site.
 */
export type AvailabilityRow = Record<string, FirestoreValue>;

/**
 * Everything a timestamp field can be by the time it reaches `toDate`. The
 * `{ toDate() }` arm is a Firestore `Timestamp`, which cannot be imported
 * here — this module is client-safe and firebase-admin is not.
 */
export type DateLike = FirestoreValue | { toDate: () => Date };

/**
 * Firestore Timestamp | Date | ISO string | epoch millis → Date, or null when
 * the value is absent or unparseable. Firestore hands back a `Timestamp` with
 * a `toDate()` method server-side but a plain ISO string once serialised, and
 * a predicate that handles only one of those silently returns the wrong answer
 * on the other runtime.
 */
export function toDate(value: DateLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "object" && typeof (value as { toDate?: () => Date }).toDate === "function") {
    const converted = (value as { toDate: () => Date }).toDate();
    return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted : null;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** Read a numeric field, or `null` when absent/non-numeric. */
export function num(value: DateLike): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * The checks every listing type shares, regardless of `listingType`.
 *
 * Note what is NOT here: `status`. Publication state (draft / in_review /
 * archived) is a different axis from availability — an archived listing is
 * hidden from the public entirely, while a sold one is still browsable in the
 * "Sold & Ended" scope. Conflating them is what made `isValidRelatedItem`
 * test for a `status: "sold"` value that has never existed.
 *
 * A field that is absent is treated as "not a reason to hide" — most rows
 * carry `isSold: false` and a real quantity, but older documents predate both
 * and must not vanish from the default scope.
 */
export function baseAvailable(row: AvailabilityRow): boolean {
  if (row[PRODUCT_FIELDS.IS_SOLD] === true) return false;

  const available = num(row[PRODUCT_FIELDS.AVAILABLE_QUANTITY]);
  if (available !== null && available <= 0) return false;

  const stock = num(row[PRODUCT_FIELDS.STOCK_QUANTITY]);
  if (stock !== null && stock <= 0) return false;

  return true;
}

/**
 * Whether a row may be shown on a public surface at all. Separate from
 * availability on purpose — see `baseAvailable`.
 */
export function isPubliclyVisible(row: AvailabilityRow): boolean {
  const status = row[PRODUCT_FIELDS.STATUS];
  return status === undefined || status === PRODUCT_FIELDS.STATUS_VALUES.PUBLISHED;
}

/**
 * The Firestore-expressible half of "this row is UNAVAILABLE".
 *
 * Every entry must be an EQUALITY, or an inequality that names its own
 * `sortField` — because Firestore implicitly appends an inequality's field to
 * the `orderBy`, so pairing one with an unrelated sort demands a composite
 * index in an order nobody declares and fails with FAILED_PRECONDITION
 * (Recurrent Root Cause #59). Equalities carry no such constraint, which is
 * what makes the "Sold & Ended" fan-out safe on a mixed type selection.
 */
export interface UnavailableClause {
  field: string;
  op: "eq" | "lt";
  /** `"NOW"` is substituted with the query's timestamp at build time. */
  value: string | number | boolean | "NOW";
  /** Required when `op !== "eq"` — the query MUST order by this field. */
  sortField?: string;
}

/**
 * For types whose only end-state is running out: standard, classified, live,
 * art, stickers. Shared rather than copy-pasted into five plugin configs,
 * which is exactly the duplication the registry exists to prevent.
 */
export const STOCK_ONLY_UNAVAILABLE_CLAUSES: readonly UnavailableClause[] = [
  { field: PRODUCT_FIELDS.AVAILABLE_QUANTITY, op: "eq", value: 0 },
  { field: PRODUCT_FIELDS.IS_SOLD, op: "eq", value: true },
];

/**
 * `isAvailable` for a type with no rule beyond `baseAvailable`. Named rather
 * than an inline `() => true` so the five configs that use it read as
 * deliberately sharing one decision, not as five independent stubs.
 */
export function alwaysAvailable(): boolean {
  return true;
}
