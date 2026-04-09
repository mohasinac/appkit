import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "collections",
  i18nNamespace: "collections",
  envKeys: [],
  routes: [
    { segment: "[locale]/collections", exports: { default: "CollectionsPageView" } },
    { segment: "[locale]/collections/[slug]", exports: { default: "CollectionDetailPage" } },
    { segment: "[locale]/admin/collections", exports: { default: "AdminCollectionsView" }, adminOnly: true },
    { segment: "[locale]/admin/collections/new", exports: { default: "AdminCollectionNewPage" }, adminOnly: true },
    { segment: "[locale]/admin/collections/[slug]", exports: { default: "AdminCollectionEditPage" }, adminOnly: true },
  ],
  apiRoutes: [
    { segment: "api/collections", methods: ["GET", "POST"] },
    { segment: "api/collections/[slug]", methods: ["GET", "PATCH", "DELETE"] },
  ],
};
