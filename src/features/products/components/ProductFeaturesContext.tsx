"use client";

import React from "react";
import type { ProductFeatureDocument } from "../schemas/product-features";

const Ctx = React.createContext<ProductFeatureDocument[] | null>(null);

export interface ProductFeaturesProviderProps {
  features: ProductFeatureDocument[];
  children: React.ReactNode;
}

export function ProductFeaturesProvider({
  features,
  children,
}: ProductFeaturesProviderProps) {
  return <Ctx.Provider value={features}>{children}</Ctx.Provider>;
}

/** Returns the registered features list, or null when no provider is mounted. */
export function useProductFeatures(): ProductFeatureDocument[] | null {
  return React.useContext(Ctx);
}
