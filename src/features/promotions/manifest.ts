import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "promotions",
  i18nNamespace: "promotions",
  envKeys: [],
  routes: [
    { segment: "[locale]/promotions", exports: { default: "PromotionsView" } },
  ],
  apiRoutes: [
    { segment: "api/promotions", methods: ["GET"] },
    { segment: "api/coupons/validate", methods: ["POST"] },
    { segment: "api/admin/coupons", methods: ["GET", "POST"] },
    { segment: "api/admin/coupons/[id]", methods: ["GET", "PATCH", "DELETE"] },
  ],
};
