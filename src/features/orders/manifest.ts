import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "orders",
  i18nNamespace: "orders",
  envKeys: [],
  routes: [
    { segment: "[locale]/orders", exports: { default: "OrdersListView" } },
    {
      segment: "[locale]/orders/[id]",
      exports: { default: "OrderDetailView" },
    },
  ],
  apiRoutes: [
    { segment: "api/orders", methods: ["GET", "POST"] },
    { segment: "api/orders/[id]", methods: ["GET", "PATCH"] },
    { segment: "api/admin/orders", methods: ["GET"] },
    { segment: "api/admin/orders/[id]", methods: ["GET", "PATCH"] },
  ],
};
