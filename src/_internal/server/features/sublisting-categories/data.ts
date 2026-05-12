import { cache } from "react";
import { sublistingCategoriesRepository } from "../../../../repositories";

export const getSublistingCategoryForDetail = cache(
  async (slug: string) => {
    return sublistingCategoriesRepository.findBySlug(slug).catch(() => null);
  },
);
