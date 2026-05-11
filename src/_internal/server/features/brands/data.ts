import { cache } from "react";
import { brandsRepository } from "../../../../repositories";
import type { BrandDocument } from "../../../../features/brands/schemas";

export const getBrandForDetail = cache(
  async (slug: string): Promise<BrandDocument | null> => {
    return (await brandsRepository.findBySlug(slug).catch(() => undefined)) ?? null;
  },
);
