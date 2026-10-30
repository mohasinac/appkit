import type { FeatureManifest } from "../../contracts";

export const manifest: FeatureManifest = {
  name: "collectorDrops",
  i18nNamespace: "collectorDrops",
  envKeys: [],
  routes: [
    { segment: "[locale]/collector-drops", exports: { default: "CollectorDropsListView" } },
    {
      segment: "[locale]/collector-drops/[slug]",
      exports: { default: "CollectorDropDetailView" },
    },
  ],
  apiRoutes: [
    { segment: "api/collector-drops", methods: ["GET"] },
    { segment: "api/collector-drops/[slug]", methods: ["GET"] },
    { segment: "api/collector-drops/[slug]/bid", methods: ["POST"] },
  ],
};
