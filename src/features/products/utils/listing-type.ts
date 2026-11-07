import type { ListingType } from "../types/index";
import { ALL_LISTING_TYPES } from "../../../_internal/shared/listing-types/feature-flags";

const LISTING_TYPE_SET: ReadonlySet<string> = new Set<string>(ALL_LISTING_TYPES);

/** True when `value` is a member of the canonical `ListingType` union. */
export function isListingType(value: string): value is ListingType {
  return LISTING_TYPE_SET.has(value);
}

/**
 * Parse a multi-select listing-type URL value into canonical types.
 *
 * The type filter is a checkbox group, so its URL value is a pipe-joined set
 * (`collector drop|pre-order`) — the same shape the Sieve adapter upgrades to a
 * Firestore `in` query. Unknown tokens are DROPPED rather than passed through:
 * an unrecognised value reaching `where("listingType","==",x)` matches zero
 * documents forever with no error (Root Cause #33), so silently ignoring it and
 * showing the wider result set is the safer failure mode.
 *
 * An empty result means "no type filter" — i.e. every type — which is exactly
 * what an empty checkbox group should mean.
 */
export function parseSelectedListingTypes(raw: string | undefined | null): ListingType[] {
  if (!raw) return [];
  const seen = new Set<ListingType>();
  for (const token of raw.split("|")) {
    const trimmed = token.trim();
    // "All" is the legacy single-select sentinel — treated as "no filter".
    if (!trimmed || trimmed === "All") continue;
    if (isListingType(trimmed)) seen.add(trimmed);
  }
  return [...seen];
}

/**
 * Toggle one type in a pipe-joined selection, returning the new URL value
 * (`""` when nothing is left selected). Keeps canonical iteration order so the
 * URL is stable regardless of the order the user ticked the boxes — otherwise
 * `collector drop|art-and-stickers` and `art-and-stickers|collector drop` would be two different React Query keys for
 * the same result set.
 */
export function toggleListingTypeSelection(
  raw: string | undefined | null,
  type: ListingType,
): string {
  const current = new Set(parseSelectedListingTypes(raw));
  if (current.has(type)) current.delete(type);
  else current.add(type);
  return ALL_LISTING_TYPES.filter((t) => current.has(t)).join("|");
}

/**
 * Canonical accessor for the listing-kind discriminator. `listingType` is the
 * single source of truth on every `ProductDocument` / `ProductItem` — the
 * legacy `isCollectorDrop` / `isPreOrder` booleans were removed in S3 (SB1-G final,
 * 2026-05-13).
 *
 * Returns `"standard"` when the input is undefined or missing the field, so
 * legacy payloads still classify safely without a separate guard.
 */
export function normalizeListingType(
  input?: { listingType?: ListingType },
): ListingType {
  const raw = input?.listingType;
  if (raw === undefined) return "standard";
  /*
   * Pre-rename spellings a stored document may still carry. Normalising them
   * HERE is what gives every `is*Listing` predicate below back-compat for
   * free, rather than each call site having to remember both spellings
   * (Root Cause #58).
   */
  if ((raw as string) === "auction") return "collector-drop";
  if ((raw as string) === "prize-draw") return "clearance";
  if ((raw as string) === "random-lots") return "clearance";
  // 1.34 — `art` and `stickers` MERGED. Both spellings are live in stored
  // product documents, so both must keep resolving here.
  if ((raw as string) === "art") return "art-and-stickers";
  if ((raw as string) === "stickers") return "art-and-stickers";
  return raw;
}

/** Convenience predicates that read the canonical `listingType` discriminator. */
export const isCollectorDropListing = (
  input?: { listingType?: ListingType },
): boolean => normalizeListingType(input) === "collector-drop";

export const isPreOrderListing = (
  input?: { listingType?: ListingType },
): boolean => normalizeListingType(input) === "pre-order";

export const isStandardListing = (
  input?: { listingType?: ListingType },
): boolean => normalizeListingType(input) === "standard";

export const isClearanceListing = (
  input?: { listingType?: ListingType },
): boolean => normalizeListingType(input) === "clearance";

// SB-UNI-F 2026-05-13 — Phase 2 union extension predicates.
export const isClassifiedListing = (
  input?: { listingType?: ListingType },
): boolean => normalizeListingType(input) === "classified";

export const isDigitalCodeListing = (
  input?: { listingType?: ListingType },
): boolean => normalizeListingType(input) === "digital-code";

export const isLiveListing = (
  input?: { listingType?: ListingType },
): boolean => normalizeListingType(input) === "live";

// Printed-only physical goods — ONE merged type (1.34). Reads through
// `normalizeListingType`, so a stored `art` or `stickers` still answers true.
export const isArtAndStickersListing = (
  input?: { listingType?: ListingType },
): boolean => normalizeListingType(input) === "art-and-stickers";

// SB-UNI-D — isBundleListing removed. Bundles are now a categoryType
// discriminator on CategoryDocument; consumers should query
// `categoriesRepository.findBySlugAndType(slug, "bundle")` instead.
