import type { FeatureManifest } from "../../contracts";

/**
 * 🛑 `default` was `SearchView` and the route has never rendered it.
 *
 * `src/app/[locale]/search/page.tsx` renders `SearchResultsClient`;
 * `SearchView` is part of the dead subsystem (no consumers, slated for
 * deletion). A manifest that names a component the route does not import is
 * a map of the codebase that is wrong in the one direction nobody checks —
 * nothing reads it at runtime, so it drifts silently and then misleads the
 * next person who trusts it.
 *
 * `api/search` is likewise still declared here while being dead; it is left
 * in place only until the deletion wave removes the route itself, so the
 * manifest and the filesystem go empty in the same commit rather than this
 * one claiming an endpoint vanished a week early.
 */
export const manifest: FeatureManifest = {
  name: "search",
  i18nNamespace: "search",
  envKeys: [],
  routes: [
    { segment: "[locale]/search", exports: { default: "SearchResultsClient" } },
  ],
  apiRoutes: [
    { segment: "api/search", methods: ["GET"] },
    { segment: "api/search/scoped", methods: ["GET"] },
    { segment: "api/search/suggestions", methods: ["GET"] },
    { segment: "api/categories/flat", methods: ["GET"] },
  ],
};
