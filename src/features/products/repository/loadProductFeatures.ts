/**
 * SSR helper: loads platform-scope features plus the store's custom features
 * in parallel, returning a single deduplicated list. Used by detail/listing
 * pages to hand `productFeatures` down as a prop and avoid per-card waterfalls.
 */
import { productFeaturesRepository } from "./product-features.repository";
import type { ProductFeatureDocument } from "../schemas/product-features";

export async function loadProductFeaturesForStore(
  storeId?: string | null,
): Promise<ProductFeatureDocument[]> {
  const [platform, store] = await Promise.all([
    productFeaturesRepository.listPlatform().catch(() => []),
    storeId
      ? productFeaturesRepository.listForStore(storeId).catch(() => [])
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
