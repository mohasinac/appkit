import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "faq",
  i18nNamespace: "faq",
  envKeys: [],
  routes: [{ segment: "[locale]/faq", exports: { default: "FAQPageView" } }],
  apiRoutes: [
    { segment: "api/faqs", methods: ["GET", "POST"] },
    { segment: "api/faqs/[id]", methods: ["GET", "PATCH", "DELETE"] },
  ],
};
