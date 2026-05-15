import { cache } from "react";
import { productRepository } from "../../../../repositories";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export interface LiveDataOptions {
  _reserved?: never;
}

/** Fetch a single live-item listing by slug, deduped per RSC render. */
export const getLiveItemForDetail = cache(
  async (slug: string, _opts?: LiveDataOptions): Promise<ProductDocument | null> => {
    void _opts;
    const product = await productRepository.findByIdOrSlug(slug).catch(() => undefined);
    if (!product || product.listingType !== "live") return null;
    return product;
  },
);
