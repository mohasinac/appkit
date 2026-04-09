import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "auctions",
  i18nNamespace: "auctions",
  envKeys: [],
  routes: [
    { segment: "[locale]/auctions", exports: { default: "AuctionsListView" } },
    {
      segment: "[locale]/auctions/[slug]",
      exports: { default: "AuctionDetailView" },
    },
  ],
  apiRoutes: [
    { segment: "api/auctions", methods: ["GET"] },
    { segment: "api/auctions/[slug]", methods: ["GET"] },
    { segment: "api/auctions/[slug]/bid", methods: ["POST"] },
  ],
};
