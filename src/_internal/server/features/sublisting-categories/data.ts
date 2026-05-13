import { cache } from "react";
import { categoriesRepository } from "../../../../repositories";

export const getSublistingCategoryForDetail = cache(
  async (slug: string) => {
    return categoriesRepository.findBySlugAndType(slug, "sublisting").catch(() => null);
  },
);
