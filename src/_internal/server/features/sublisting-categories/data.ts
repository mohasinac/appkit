import { cache } from "react";
import { categoriesRepository } from "../../../../features/categories/repository/categories.repository";

export const getSublistingCategoryForDetail = cache(
  async (slug: string) => {
    return categoriesRepository.findBySlugAndType(slug, "sublisting");
  },
);
