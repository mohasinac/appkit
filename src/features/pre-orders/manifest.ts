import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "pre-orders",
  i18nNamespace: "preOrders",
  envKeys: [],
  routes: [
    {
      segment: "[locale]/pre-orders",
      exports: { default: "PreOrdersListView" },
    },
  ],
  apiRoutes: [
    { segment: "api/pre-orders", methods: ["GET", "POST"] },
    { segment: "api/pre-orders/[id]", methods: ["GET", "PATCH", "DELETE"] },
    { segment: "api/admin/pre-orders", methods: ["GET"] },
    { segment: "api/admin/pre-orders/[id]", methods: ["GET", "PATCH"] },
  ],
};
