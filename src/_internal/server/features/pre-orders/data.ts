import { cache } from "react";
import { productRepository } from "../../../../repositories";
import { loadProductFeaturesForStore } from "../../../../features/products/repository/loadProductFeatures";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import type { ProductFeatureDocument } from "../../../../features/products/schemas/product-features";

export const getPreOrderForDetail = cache(
  async (slugOrId: string): Promise<ProductDocument | null> => {
    return (await productRepository.findByIdOrSlug(slugOrId).catch(() => undefined)) ?? null;
  },
);

export const getProductFeaturesForPreOrder = cache(
  async (storeId: string | null): Promise<ProductFeatureDocument[]> => {
    return loadProductFeaturesForStore(storeId).catch(() => []);
  },
);
