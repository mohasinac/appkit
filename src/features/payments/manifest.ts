import type { FeatureManifest } from "../../contracts";

export const manifest: FeatureManifest = {
  name: "payments",
  i18nNamespace: "payments",
  envKeys: ["PHONEPE_CLIENT_ID", "PHONEPE_CLIENT_SECRET"],
  routes: [],
  apiRoutes: [
    { segment: "api/payments/create", methods: ["POST"] },
    { segment: "api/payments/verify", methods: ["POST"] },
    { segment: "api/payments/webhook", methods: ["POST"] },
    { segment: "api/admin/payments/settings", methods: ["GET", "PATCH"] },
  ],
};
