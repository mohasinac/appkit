import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "homepage",
  i18nNamespace: "homepage",
  envKeys: [],
  routes: [{ segment: "[locale]", exports: { default: "HomepageView" } }],
  apiRoutes: [
    { segment: "api/homepage", methods: ["GET"] },
    { segment: "api/homepage/sections", methods: ["GET", "POST"] },
    {
      segment: "api/homepage/sections/[id]",
      methods: ["GET", "PATCH", "DELETE"],
    },
  ],
};
