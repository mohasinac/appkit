import { cache } from "react";
import { brandsRepository, categoriesRepository } from "../../../../repositories";
import type { BrandDocument } from "../../../../features/brands/schemas";
import type { CategoryDocument } from "../../../../features/categories/schemas/firestore";

export const getBrandForDetail = cache(
  async (slug: string): Promise<BrandDocument | null> => {
    return (await brandsRepository.findBySlug(slug).catch(() => undefined)) ?? null;
  },
);

/**
 * Brand-as-category lookup for the brand detail view, deduped per request.
 *
 * BrandDetailPageView renders the categories-collection record (display + metrics
 * fields), not the brands-collection record. Keep both fetchers so
 * generateMetadata can pull BrandDocument fields (logoURL) while the view pulls
 * CategoryDocument.
 */
export const getBrandCategoryForDetail = cache(
  async (slug: string): Promise<CategoryDocument | null> => {
    return categoriesRepository.getCategoryBySlug(slug).catch(() => null);
  },
);
