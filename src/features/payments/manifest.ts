import type { FeatureManifest } from "@mohasinac/contracts";

export const manifest: FeatureManifest = {
  name: "payments",
  i18nNamespace: "payments",
  envKeys: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
  routes: [],
  apiRoutes: [
    { segment: "api/payments/create", methods: ["POST"] },
    { segment: "api/payments/verify", methods: ["POST"] },
    { segment: "api/payments/webhook", methods: ["POST"] },
    { segment: "api/admin/payments/settings", methods: ["GET", "PATCH"] },
  ],
};
