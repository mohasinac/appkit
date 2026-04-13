import type { FeatureManifest } from "../../contracts";

export const manifest: FeatureManifest = {
  name: "products",
  i18nNamespace: "products",
  envKeys: [],
  routes: [
    { segment: "[locale]/products", exports: { default: "ProductsListView" } },
    {
      segment: "[locale]/products/[slug]",
      exports: { default: "ProductDetailView" },
    },
  ],
  apiRoutes: [
    { segment: "api/products", methods: ["GET", "POST"] },
    { segment: "api/products/[slug]", methods: ["GET", "PATCH", "DELETE"] },
  ],
};
