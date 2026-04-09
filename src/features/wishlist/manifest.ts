import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "wishlist",
  i18nNamespace: "wishlist",
  envKeys: [],
  routes: [
    { segment: "[locale]/wishlist", exports: { default: "WishlistView" } },
  ],
  apiRoutes: [
    { segment: "api/wishlist", methods: ["GET", "POST"] },
    { segment: "api/wishlist/[id]", methods: ["DELETE"] },
  ],
};
