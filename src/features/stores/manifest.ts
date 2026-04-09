import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "stores",
  i18nNamespace: "stores",
  envKeys: [],
  routes: [
    { segment: "[locale]/stores", exports: { default: "StoresListView" } },
    {
      segment: "[locale]/stores/[storeSlug]",
      exports: { default: "StoreStorefrontView" },
    },
    {
      segment: "[locale]/stores/[storeSlug]/products",
      exports: { default: "StoreProductsView" },
    },
    {
      segment: "[locale]/stores/[storeSlug]/auctions",
      exports: { default: "StoreAuctionsView" },
    },
    {
      segment: "[locale]/stores/[storeSlug]/reviews",
      exports: { default: "StoreReviewsView" },
    },
    {
      segment: "[locale]/stores/[storeSlug]/about",
      exports: { default: "StoreAboutView" },
    },
  ],
  apiRoutes: [
    { segment: "api/stores", methods: ["GET"] },
    { segment: "api/stores/[storeSlug]", methods: ["GET"] },
    { segment: "api/stores/[storeSlug]/products", methods: ["GET"] },
    { segment: "api/stores/[storeSlug]/auctions", methods: ["GET"] },
    { segment: "api/stores/[storeSlug]/reviews", methods: ["GET"] },
  ],
};
