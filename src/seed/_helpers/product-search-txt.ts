import { buildSearchTxt } from "../../utils/search-txt";
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
  return {
    ...p,
    searchTxt: buildSearchTxt([
      p.title,
      p.description,
      p.brand,
      p.brandSlug,
      p.categoryNames,
      p.tags,
      p.features,
      p.condition,
      p.specifications?.map((s) => `${s.name} ${s.value}`),
    ]),
  };
}
