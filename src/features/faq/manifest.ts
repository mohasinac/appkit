import type { FeatureManifest } from "../../contracts";

/*
 * Corrected 2026-11 (Phase 2F) — the real canonical route is the PLURAL
 * `[locale]/faqs`; `[locale]/faq` (singular) is only a redirect shim to it.
 * The `[category]` detail route was missing entirely.
 */
export const manifest: FeatureManifest = {
  name: "faq",
  i18nNamespace: "faq",
  envKeys: [],
  routes: [
    { segment: "[locale]/faqs", exports: { default: "FAQPageView" } },
    { segment: "[locale]/faqs/[category]", exports: { default: "FAQPageView" } },
  ],
  apiRoutes: [
    { segment: "api/faqs", methods: ["GET", "POST"] },
    { segment: "api/faqs/[id]", methods: ["GET", "PATCH", "DELETE"] },
  ],
};
