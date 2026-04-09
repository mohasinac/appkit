import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "corporate",
  i18nNamespace: "corporate",
  envKeys: [],
  routes: [
    { segment: "[locale]/corporate-gifting", exports: { default: "CorporateGiftingPageView" } },
  ],
  apiRoutes: [
    { segment: "api/corporate-inquiries", methods: ["GET", "POST"] },
    { segment: "api/corporate-inquiries/[id]", methods: ["GET", "PATCH", "DELETE"] },
  ],
};
