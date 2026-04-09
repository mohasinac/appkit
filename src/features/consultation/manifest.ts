import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "consultation",
  i18nNamespace: "consultation",
  envKeys: [],
  routes: [
    { segment: "[locale]/consultation", exports: { default: "ConsultationPageView" } },
  ],
  apiRoutes: [
    { segment: "api/consultations", methods: ["GET", "POST"] },
    { segment: "api/consultations/[id]", methods: ["GET", "PATCH", "DELETE"] },
  ],
};
