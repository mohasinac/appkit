import type { FeatureManifest } from "../../contracts";

/*
 * Corrected 2026-11 (Phase 2F) — `leaderboard`/`spin-results`/`winner` were
 * entirely missing (the event-detail page is route-per-tab, not one view).
 * The first two are hand-authored consumer markup with no single
 * feature-package component to name — flagged rather than guessed.
 */
export const manifest: FeatureManifest = {
  name: "events",
  i18nNamespace: "events",
  envKeys: [],
  routes: [
    { segment: "[locale]/events", exports: { default: "EventsListView" } },
    {
      segment: "[locale]/events/[id]",
      exports: { default: "EventDetailView" },
    },
    {
      segment: "[locale]/events/[id]/participate",
      exports: { default: "EventParticipateView" },
    },
    {
      // Consumer-authored page markup, not an appkit view — see header note.
      segment: "[locale]/events/[id]/leaderboard",
      exports: { default: "(page-local — no feature-package component)" },
    },
    {
      segment: "[locale]/events/[id]/spin-results",
      exports: { default: "(page-local — no feature-package component)" },
    },
    {
      segment: "[locale]/events/[id]/winner",
      exports: { default: "EventGiveawayWinnerView" },
    },
  ],
  apiRoutes: [
    { segment: "api/events", methods: ["GET"] },
    { segment: "api/events/[id]", methods: ["GET"] },
    { segment: "api/events/[id]/entries", methods: ["GET", "POST"] },
    // Added 2026-11 (Phase 2F) — 11 of 17 real route files were missing.
    { segment: "api/events/[id]/likes", methods: ["GET", "POST"] },
    { segment: "api/events/[id]/giveaway-entries", methods: ["GET"] },
    { segment: "api/events/[id]/giveaway-pull", methods: ["POST"] },
    { segment: "api/events/[id]/spin", methods: ["POST"] },
    { segment: "api/admin/events", methods: ["GET", "POST"] },
    { segment: "api/admin/events/[id]", methods: ["GET", "PATCH", "DELETE"] },
    { segment: "api/admin/events/[id]/entries", methods: ["GET", "PATCH"] },
    { segment: "api/admin/events/[id]/entries/[entryId]", methods: ["PATCH"] },
    { segment: "api/admin/events/[id]/entries/export", methods: ["GET"] },
    { segment: "api/admin/events/[id]/duplicate", methods: ["POST"] },
    { segment: "api/admin/events/[id]/giveaway-config", methods: ["PUT"] },
    { segment: "api/admin/events/[id]/stats", methods: ["GET"] },
    { segment: "api/admin/events/[id]/status", methods: ["PATCH"] },
    { segment: "api/admin/events/[id]/trigger-giveaway", methods: ["POST"] },
  ],
};
