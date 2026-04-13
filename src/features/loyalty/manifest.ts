import type { FeatureManifest } from "../../contracts";

export const manifest: FeatureManifest = {
  name: "loyalty",
  i18nNamespace: "loyalty",
  envKeys: [],
  routes: [
    { segment: "[locale]/account/coins", exports: { default: "LoyaltyPageView" } },
    { segment: "[locale]/admin/loyalty", exports: { default: "AdminLoyaltyView" }, adminOnly: true },
  ],
  apiRoutes: [
    { segment: "api/loyalty/balance", methods: ["GET"] },
    { segment: "api/loyalty/earn", methods: ["POST"] },
    { segment: "api/loyalty/redeem", methods: ["POST"] },
    { segment: "api/loyalty/history", methods: ["GET"] },
    { segment: "api/admin/loyalty/grant", methods: ["POST"] },
  ],
};
