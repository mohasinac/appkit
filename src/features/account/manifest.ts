import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "account",
  i18nNamespace: "account",
  envKeys: [],
  routes: [
    {
      segment: "[locale]/account",
      exports: { default: "AccountDashboardView" },
    },
    {
      segment: "[locale]/account/profile",
      exports: { default: "ProfileView" },
    },
    {
      segment: "[locale]/account/addresses",
      exports: { default: "AddressesView" },
    },
    {
      segment: "[locale]/account/orders",
      exports: { default: "AccountOrdersView" },
    },
  ],
  apiRoutes: [
    { segment: "api/account/[userId]", methods: ["GET", "PATCH"] },
    { segment: "api/account/[userId]/addresses", methods: ["GET", "POST"] },
  ],
};
