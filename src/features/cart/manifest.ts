import type { FeatureManifest } from "../../contracts";

export const manifest: FeatureManifest = {
  name: "cart",
  i18nNamespace: "cart",
  envKeys: [],
  routes: [{ segment: "[locale]/cart", exports: { default: "CartView" } }],
  apiRoutes: [
    { segment: "api/cart", methods: ["GET", "POST"] },
    { segment: "api/cart/[id]", methods: ["PATCH", "DELETE"] },
  ],
};
