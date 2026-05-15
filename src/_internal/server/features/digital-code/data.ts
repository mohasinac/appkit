import { cache } from "react";
import { productRepository } from "../../../../repositories";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export interface DigitalCodeDataOptions {
  _reserved?: never;
}

/** Fetch a single digital-code listing by slug, deduped per RSC render. */
export const getDigitalCodeForDetail = cache(
  async (slug: string, _opts?: DigitalCodeDataOptions): Promise<ProductDocument | null> => {
    void _opts;
    const product = await productRepository.findByIdOrSlug(slug).catch(() => undefined);
    if (!product || product.listingType !== "digital-code") return null;
    return product;
  },
);
