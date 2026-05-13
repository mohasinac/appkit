import { cache } from "react";
import { categoriesRepository } from "../../../../repositories";
import type { CategoryDocument } from "../../../../features/categories/schemas/firestore";

/**
 * Brand detail loader — SB-UNI-C moved brands into the `categories`
 * collection with `categoryType: "brand"`. Both `generateMetadata` and
 * `BrandDetailPageView` consume the same `CategoryDocument` shape.
 */
export const getBrandForDetail = cache(
  async (slug: string): Promise<CategoryDocument | null> => {
    return categoriesRepository.findBySlugAndType(slug, "brand").catch(() => null);
  },
);

/**
 * @deprecated Identical to getBrandForDetail after SB-UNI-C. Kept as an
 * alias so existing imports don't break.
 */
export const getBrandCategoryForDetail = getBrandForDetail;
