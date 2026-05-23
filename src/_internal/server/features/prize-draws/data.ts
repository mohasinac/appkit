/**
 * Prize Draw data layer — OG-coverage-followup 2026-05-23.
 *
 * Prize draws live as products with `listingType:"prize-draw"`. This file
 * wraps the repo call in `React.cache` so the OG renderer and any future
 * page/generateMetadata pair share one Firestore read per request.
 */

import { cache } from "react";
import { productRepository } from "../../../../repositories";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export interface PrizeDrawDataOptions {
  _reserved?: never;
}

/**
 * Fetch a single prize-draw product by slug or id. Returns null when the
 * slug is empty or no matching product exists. The caller is responsible
 * for asserting `listingType === "prize-draw"` if a strict gate is required.
 */
export const getPrizeDrawForDetail = cache(
  async (
    slugOrId: string,
    _opts?: PrizeDrawDataOptions,
  ): Promise<ProductDocument | null> => {
    void _opts;
    if (!slugOrId) return null;
    return (await productRepository.findByIdOrSlug(slugOrId).catch(() => null)) ?? null;
  },
);
