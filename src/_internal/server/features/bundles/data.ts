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
import { safeRead } from "../../../../errors/safe-read";
import type { CategoryDocument } from "../../../../features/categories/schemas";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import { hidePublicTestData } from "../tester/visibility";

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
 * Resolve the effective member product ids for a bundle. `bundleProductIds`
 * is the index-friendly mirror and is normally authoritative, but a bundle
 * can be written (e.g. by seed data or a partial API payload) with only its
 * `bundleQueryRule` set and no mirror — falls back to the static rule's
 * `productIds` in that case rather than silently rendering an empty bundle.
 */
export function resolveBundleMemberIds(
  bundle: Pick<CategoryDocument, "bundleProductIds" | "bundleQueryRule">,
): string[] {
  if (bundle.bundleProductIds?.length) return bundle.bundleProductIds;
  if (bundle.bundleQueryRule?.type === "static") {
    return bundle.bundleQueryRule.productIds;
  }
  return [];
}

/**
 * Fetch the resolved product members of a bundle. Hydrates each id from
 * `resolveBundleMemberIds` via `productRepository.findById`. Returns an
 * empty array when the bundle has no resolvable members yet.
 */
export const listBundleMembers = cache(
  async (
    bundle: Pick<CategoryDocument, "bundleProductIds" | "bundleQueryRule">,
    _opts?: BundleDataOptions,
  ): Promise<ProductDocument[]> => {
    void _opts;
    const ids = resolveBundleMemberIds(bundle);
    if (ids.length === 0) return [];
    const results = await Promise.all(
      ids.map((id) =>
        safeRead(() => productRepository.findById(id), {
          route: "/bundles",
          key: "bundles.listBundleMembers.member",
          fallback: null,
        }),
      ),
    );
    return results.filter((p): p is ProductDocument => p !== null);
  },
);

/**
 * Sum the individual prices of a set of member products — the "buy
 * separately" total a bundle's discount is measured against. Used at bundle
 * create/update time (and by the daily `runBundleStockSync` sweep) to
 * populate `bundleOriginalTotal`. Deliberately returns `undefined` (rather
 * than a partial sum) when any member id fails to resolve, so a stale or
 * broken reference never understates the "before" price and inflates the
 * displayed discount.
 */
export async function resolveBundleOriginalTotal(
  productIds: string[],
): Promise<number | undefined> {
  if (productIds.length === 0) return undefined;
  const results = await Promise.all(
    productIds.map((id) =>
      safeRead(() => productRepository.findById(id), {
        route: "/bundles",
        key: "bundles.resolveBundleOriginalTotal.member",
        fallback: null,
      }),
    ),
  );
  const prices: number[] = [];
  for (const p of results) {
    if (!p || typeof p.price !== "number") return undefined;
    prices.push(p.price);
  }
  const total = prices.reduce((sum, p) => sum + p, 0);
  return Math.round(total * 100) / 100;
}

/**
 * Reject a bundle whose members belong to more than one seller.
 *
 * `storeId` is a SCALAR on the cart line, and it is simultaneously the
 * order-splitting key and the key that per-store add-ons, coupons, shipping and
 * payout all hang off. A bundle spanning two sellers therefore produces one
 * order belonging to one of them while containing the other's products — the
 * second seller gets no notification, no shipping resolution and no payout.
 *
 * Grouped cart lines refuse this at both the picker and the add-to-cart action.
 * Bundles had no equivalent guard, so the only reason nothing was broken was
 * that every bundle anyone had built happened to be single-store. This closes
 * that at the point a bundle is SAVED, which is the cheapest place to say no:
 * bundles already in the database keep working, and checkout is untouched.
 *
 * Returns the offending store ids (empty when fine) rather than throwing, so
 * each route can phrase its own 400.
 */
export async function findBundleMemberStores(productIds: string[]): Promise<string[]> {
  if (productIds.length === 0) return [];
  const results = await Promise.all(
    productIds.map((id) =>
      safeRead(() => productRepository.findById(id), {
        route: "/bundles",
        key: "bundles.findBundleMemberStores.member",
        fallback: null,
      }),
    ),
  );
  const stores = new Set<string>();
  for (const p of results) {
    // An unresolvable member says nothing about seller spread — the price
    // helper above already refuses to guess in that case, and inventing a
    // store here would produce a false positive that blocks a valid save.
    if (p?.storeId) stores.add(p.storeId);
  }
  return [...stores];
}

/**
 * Union of the member products' `categorySlugs` — the `bundleCategorySlugs`
 * mirror that lets a category page scope its Bundles tab.
 *
 * A bundle row has no category field of its own, which is why the category page
 * counted every active bundle site-wide before this existed. Maintained at the
 * same call sites as `resolveBundleOriginalTotal` so the two mirrors cannot
 * drift apart.
 *
 * Unlike the price total, a partially-resolvable member set still yields a
 * useful answer: over-inclusion (a bundle appearing under one category too many)
 * is a far smaller error than a bundle vanishing from the category it belongs
 * to, and readers already treat an ABSENT mirror as "unscoped" rather than
 * "belongs nowhere" (Root Cause #42).
 */
export async function resolveBundleCategorySlugs(
  productIds: string[],
): Promise<string[]> {
  if (productIds.length === 0) return [];
  const results = await Promise.all(
    productIds.map((id) =>
      safeRead(() => productRepository.findById(id), {
        route: "/bundles",
        key: "bundles.resolveBundleCategorySlugs.member",
        fallback: null,
      }),
    ),
  );
  const slugs = new Set<string>();
  for (const p of results) {
    for (const slug of p?.categorySlugs ?? []) slugs.add(slug);
  }
  return [...slugs];
}

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
    const all = await safeRead(
      () => categoriesRepository.listByType("bundle", { activeOnly: true, limit }),
      {
        route: "bundles/getFeaturedBundles",
        key: "categories.listByType(bundle)",
        fallback: [],
      },
    );
    return hidePublicTestData(all);
  },
);

/**
 * "Related Bundles" for the bundle detail page — every other active bundle,
 * excluding the current one. Bundles are a CategoryDocument, not a
 * ProductDocument, so this mirrors BrandDetailPageView's "Related Brands"
 * pattern (all active siblings of the same categoryType) rather than the
 * product-based 4-signal computeRelatedItems() used elsewhere — bundle
 * detail pages had no related section at all before this.
 */
export const getRelatedBundles = cache(
  async (bundle: Pick<CategoryDocument, "id">, limit = 8): Promise<CategoryDocument[]> => {
    const all = await safeRead(
      () =>
        categoriesRepository.listByType("bundle", {
          activeOnly: true,
          limit: limit + 1,
        }),
      {
        route: "bundles/getRelatedBundles",
        key: "categories.listByType(bundle)",
        fallback: [],
      },
    );
    return hidePublicTestData(all)
      .filter((b) => b.id !== bundle.id)
      .slice(0, limit);
  },
);
