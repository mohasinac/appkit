import { BrandsRepository } from "../repository/brands.repository";
import type { BrandDocument } from "../schemas";

const brandsRepository = new BrandsRepository();

export async function getBrandBySlug(slug: string): Promise<BrandDocument | null> {
  return brandsRepository.findBySlug(slug);
}
