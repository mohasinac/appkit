import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "admin",
  i18nNamespace: "admin",
  envKeys: [],
  routes: [
    {
      segment: "[locale]/admin",
      exports: { default: "AdminDashboardView" },
      adminOnly: true,
    },
  ],
  apiRoutes: [{ segment: "api/admin/stats", methods: ["GET"] }],
};
