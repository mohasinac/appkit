import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "reviews",
  i18nNamespace: "reviews",
  envKeys: [],
  routes: [],
  apiRoutes: [
    { segment: "api/reviews", methods: ["GET", "POST"] },
    { segment: "api/reviews/[id]", methods: ["GET", "PATCH", "DELETE"] },
  ],
};
