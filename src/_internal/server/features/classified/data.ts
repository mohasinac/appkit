import { cache } from "react";
import { productRepository } from "../../../../repositories";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export interface ClassifiedDataOptions {
  _reserved?: never;
}

/** Fetch a single classified listing by slug, deduped per RSC render. */
export const getClassifiedForDetail = cache(
  async (slug: string, _opts?: ClassifiedDataOptions): Promise<ProductDocument | null> => {
    void _opts;
    const product = await productRepository.findByIdOrSlug(slug).catch(() => undefined);
    if (!product || product.listingType !== "classified") return null;
    return product;
  },
);
