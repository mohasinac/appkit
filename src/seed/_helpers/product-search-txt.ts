import { buildProductSearchTxt } from "../../utils/search-txt-builders";
import type { ProductDocument } from "../../features/products/schemas";

/**
 * Derive `searchTxt` for a seeded product from its own content.
 *
 * Applied to the WHOLE array at each file's export rather than written per
 * record. Four of the product seed files built records as inline literals with
 * an inline `searchTxt:`, and in every one of them the last record — the
 * "sold"/"depleted" fixture appended at the bottom — had been added without it.
 * Those are exactly the rows the "Sold & Ended" scope exists to exercise, so
 * they were invisible to search in the one view built to show them.
 *
 * The `...p` spread comes FIRST so a record cannot override or omit the field:
 * that ordering is the actual guarantee, not the convention around it.
 *
 * Pure function of the record's content — deterministic, so this does not
 * reintroduce the `appkit-seed` idempotency problem of Root Cause #25.
 */
export function withProductSearchTxt(
  p: Partial<ProductDocument>,
): Partial<ProductDocument> {
  // Delegates rather than re-deriving. This wrapper listed 9 sources while the
  // write path indexed 12, so a seeded product was findable by fewer terms than
  // the identical product created through the app — with no error on either side.
  return { ...p, searchTxt: buildProductSearchTxt(p) };
}
