/**
 * SSR helper: loads platform-scope features plus the store's custom features
 * in parallel, returning a single deduplicated list. Used by detail/listing
 * pages to hand `productFeatures` down as a prop and avoid per-card waterfalls.
 */
import { productFeaturesRepository } from "./product-features.repository";
import { safeRead } from "../../../errors/safe-read";
import type { ProductFeatureDocument } from "../schemas/product-features";

export async function loadProductFeaturesForStore(
  storeId?: string | null,
): Promise<ProductFeatureDocument[]> {
  // Feature badges decorate a card; a page without them is still correct, so
  // both reads degrade — but a failure here silently strips "Free shipping" /
  // "Authenticity guaranteed" from every card, which nobody would notice.
  const [platform, store] = await Promise.all([
    safeRead(() => productFeaturesRepository.listPlatform(), {
      route: "productFeatures", key: "productFeatures.platform", fallback: [],
    }),
    storeId
      ? safeRead(() => productFeaturesRepository.listForStore(storeId), {
          route: "productFeatures", key: "productFeatures.store", fallback: [],
        })
      : Promise.resolve([]),
  ]);
  const seen = new Set<string>();
  const merged: ProductFeatureDocument[] = [];
  for (const f of [...platform, ...store]) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    merged.push(f);
  }
  return merged;
}
