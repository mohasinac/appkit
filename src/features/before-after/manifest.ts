import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "before-after",
  i18nNamespace: "beforeAfter",
  envKeys: [],
  routes: [],
  apiRoutes: [
    { segment: "api/before-after", methods: ["GET", "POST"] },
    { segment: "api/before-after/[id]", methods: ["GET", "PATCH", "DELETE"] },
  ],
};
