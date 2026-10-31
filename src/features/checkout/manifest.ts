import type { FeatureManifest } from "../../contracts";

/*
 * Corrected 2026-11 (Phase 2F) against the real routes — this manifest had
 * never been read by anything, and all three of its claims were stale:
 * `[locale]/checkout/confirmation` does not exist (the real directory is
 * `checkout/success`); none of `api/checkout/shipping-options`,
 * `/place-order` or `/apply-coupon` exist by those names (placing an order
 * is `POST /api/checkout` itself; shipping quotes are `/api/shipping/quote`;
 * coupons are applied at `/api/cart/coupon`, not a checkout-specific route).
 */
export const manifest: FeatureManifest = {
  name: "checkout",
  i18nNamespace: "checkout",
  envKeys: [],
  routes: [
    { segment: "[locale]/checkout", exports: { default: "CheckoutRouteClient" } },
    {
      segment: "[locale]/checkout/success",
      exports: { default: "CheckoutSuccessRouteClient" },
    },
  ],
  apiRoutes: [
    { segment: "api/checkout", methods: ["POST"] },
    { segment: "api/checkout/preflight", methods: ["POST"] },
    { segment: "api/checkout/pricing-preview", methods: ["POST"] },
  ],
};
