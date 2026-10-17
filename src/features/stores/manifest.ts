import type { FeatureManifest } from "../../contracts";

export const manifest: FeatureManifest = {
  name: "stores",
  i18nNamespace: "stores",
  envKeys: [],
  routes: [
    { segment: "[locale]/stores", exports: { default: "StoresIndexPageView" } },
    /*
     * `[locale]/stores/[storeSlug]` is deliberately ABSENT. It is a bare
     * `redirect()` to the products tab and renders no view at all, so there is
     * no appkit export to name — and naming one is exactly how
     * `StoreStorefrontView` (an alias of the orphaned `SellerStoreView` slot
     * shell) kept reading as wired for as long as it did. The storefront chrome
     * lives in the segment's own layout; the tabs below are the real views.
     */
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
