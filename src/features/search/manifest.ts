import type { FeatureManifest } from "../../contracts";

/**
 * `default` is `SearchResultsClient`, which is what `[locale]/search/page.tsx`
 * actually renders. It used to say `SearchView` — a component the route has
 * never rendered, from the dead legacy `feat-search` subsystem — and A7
 * (`audit-feature-manifest-routes`) is what this file is the fixed example
 * for.
 *
 * `api/search` (the dead `SearchRepository`-backed GET handler) was removed
 * from `apiRoutes` in the same Wave 10 commit that deleted the route itself
 * — the manifest and the filesystem go empty together, not one claiming the
 * other vanished a week early.
 */
export const manifest: FeatureManifest = {
  name: "search",
  i18nNamespace: "search",
  envKeys: [],
  routes: [
    { segment: "[locale]/search", exports: { default: "SearchResultsClient" } },
  ],
  apiRoutes: [
    { segment: "api/search/scoped", methods: ["GET"] },
    { segment: "api/search/suggestions", methods: ["GET"] },
    { segment: "api/categories/flat", methods: ["GET"] },
  ],
};
