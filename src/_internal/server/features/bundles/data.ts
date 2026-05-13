/**
 * Bundle data layer — SB-UNI-3 2026-05-13.
 *
 * Bundles live as `categoryType:"bundle"` rows on the categories collection
 * (SB-UNI-D + V). This file wraps the repo calls in `React.cache` so a page
 * and its `generateMetadata` share one Firestore read per request.
 */

import { cache } from "react";
import { categoriesRepository } from "../../../../repositories";
import { productRepository } from "../../../../repositories";
import type { CategoryDocument } from "../../../../features/categories/schemas";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";

export interface BundleDataOptions {
  /** Reserved for future overrides. */
  _reserved?: never;
}

/**
 * Fetch a single bundle by slug for the public detail page. Returns null
 * when the slug is empty or no matching `categoryType:"bundle"` row exists.
 */
export const getBundleForDetail = cache(
  async (
    slug: string,
    _opts?: BundleDataOptions,
  ): Promise<CategoryDocument | null> => {
    void _opts;
    if (!slug) return null;
    return categoriesRepository.findBySlugAndType(slug, "bundle");
  },
);

/**
 * Fetch the resolved product members of a bundle. Reads `bundleProductIds`
 * off the bundle document and hydrates each via `productRepository.findById`.
 * Returns an empty array when the bundle has no product mirror yet.
 */
export const listBundleMembers = cache(
  async (
    bundle: Pick<CategoryDocument, "bundleProductIds">,
    _opts?: BundleDataOptions,
  ): Promise<ProductDocument[]> => {
    void _opts;
    const ids = bundle.bundleProductIds ?? [];
    if (ids.length === 0) return [];
    const results = await Promise.all(
      ids.map((id) => productRepository.findById(id).catch(() => null)),
    );
    return results.filter((p): p is ProductDocument => p !== null);
  },
);

/**
 * List the most recent active bundles for homepage placement. Bounded to
 * `limit` (default 8) and filtered to `isActive: true` server-side.
 */
export const listFeaturedBundles = cache(
  async (
    limit = 8,
    _opts?: BundleDataOptions,
  ): Promise<CategoryDocument[]> => {
    void _opts;
    const all = await categoriesRepository
      .listByType("bundle", { activeOnly: true, limit })
      .catch(() => []);
    return all;
  },
);
