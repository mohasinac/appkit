import { categoriesRepository } from "../../../../repositories";
import { BrandNotFoundError, BrandSlugConflictError } from "../../../shared/features/brands/errors";
import type { CategoryDocument } from "../../../../features/categories/schemas/firestore";

export async function assertBrandExists(slugOrId: string): Promise<CategoryDocument> {
  const brand =
    (await categoriesRepository.findBySlugAndType(slugOrId, "brand")) ??
    (await categoriesRepository.findById(slugOrId));
  if (!brand || brand.categoryType !== "brand") throw new BrandNotFoundError(slugOrId);
  return brand;
}

export async function assertBrandSlugUnique(slug: string): Promise<void> {
  const existing = await categoriesRepository.findBySlugAndType(slug, "brand");
  if (existing) throw new BrandSlugConflictError(slug);
}
