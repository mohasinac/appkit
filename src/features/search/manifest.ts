import type { FeatureManifest } from "../../contracts";

export const manifest: FeatureManifest = {
  name: "search",
  i18nNamespace: "search",
  envKeys: [],
  routes: [{ segment: "[locale]/search", exports: { default: "SearchView" } }],
  apiRoutes: [
    { segment: "api/search", methods: ["GET"] },
    { segment: "api/categories/flat", methods: ["GET"] },
  ],
};
