import type { FeatureManifest } from "@mohasinac/contracts";

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
  ],
  apiRoutes: [
    { segment: "api/events", methods: ["GET"] },
    { segment: "api/events/[id]", methods: ["GET"] },
    { segment: "api/events/[id]/entries", methods: ["GET", "POST"] },
    { segment: "api/admin/events", methods: ["GET", "POST"] },
    { segment: "api/admin/events/[id]", methods: ["GET", "PATCH", "DELETE"] },
    { segment: "api/admin/events/[id]/entries", methods: ["GET", "PATCH"] },
  ],
};
