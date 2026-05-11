import { brandsRepository } from "../../../../repositories";
import { BrandNotFoundError, BrandSlugConflictError } from "../../../shared/features/brands/errors";
import type { BrandDocument } from "../../../../features/brands/schemas";

export async function assertBrandExists(slugOrId: string): Promise<BrandDocument> {
  const brand = await brandsRepository.findBySlug(slugOrId).catch(() => null)
    ?? await brandsRepository.findById(slugOrId).catch(() => null);
  if (!brand) throw new BrandNotFoundError(slugOrId);
  return brand;
}

export async function assertBrandSlugUnique(slug: string): Promise<void> {
  const existing = await brandsRepository.findBySlug(slug).catch(() => null);
  if (existing) throw new BrandSlugConflictError(slug);
}
