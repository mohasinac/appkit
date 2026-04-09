import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "blog",
  i18nNamespace: "blog",
  envKeys: [],
  routes: [
    { segment: "[locale]/blog", exports: { default: "BlogListView" } },
    { segment: "[locale]/blog/[slug]", exports: { default: "BlogPostView" } },
  ],
  apiRoutes: [
    { segment: "api/blog", methods: ["GET", "POST"] },
    { segment: "api/blog/[slug]", methods: ["GET", "PATCH", "DELETE"] },
    { segment: "api/blog/[slug]/related", methods: ["GET"] },
  ],
};
