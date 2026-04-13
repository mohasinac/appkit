import type { FeatureManifest } from "../../contracts";

export const manifest: FeatureManifest = {
  name: "checkout",
  i18nNamespace: "checkout",
  envKeys: [],
  routes: [
    { segment: "[locale]/checkout", exports: { default: "CheckoutView" } },
    {
      segment: "[locale]/checkout/confirmation",
      exports: { default: "CheckoutConfirmationView" },
    },
  ],
  apiRoutes: [
    { segment: "api/checkout/shipping-options", methods: ["POST"] },
    { segment: "api/checkout/place-order", methods: ["POST"] },
    { segment: "api/checkout/apply-coupon", methods: ["POST"] },
  ],
};
