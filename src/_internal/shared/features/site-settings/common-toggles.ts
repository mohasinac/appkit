/**
 * Common toggles — the small, explicit list of site-settings booleans worth
 * surfacing directly on the admin dashboard-landing search + card (Phase 9,
 * overhaul brief). The owner's own motivating example: reaching Maintenance
 * mode took four clicks (Site Settings → a 20-tab dropdown → guess
 * "Branding" → scroll past Site name/Tagline/Logo/Favicon) — this registry is
 * what lets "maintenance" in the dashboard search resolve straight to a
 * working switch instead of a page.
 *
 * 🛑 Deliberately NOT a generic "toggle any dot-path" primitive. `id` is
 * matched against this closed list server-side
 * (`PATCH /api/admin/site-settings/common-toggle/[id]`), the same closed-set
 * safety `PATCH /api/admin/listing-types/[type]/toggle` already uses for
 * `ALL_LISTING_TYPES` — a client cannot name an arbitrary `siteSettings.*`
 * path to flip.
 *
 * `group` is the top-level `siteSettings` key the toggle's own `enabled`
 * field lives under. All three entries here already exist and are already
 * saved by the full-form admin editor (`AdminSiteSettingsView`) — this
 * registry does not add a new field, it names three that already exist as a
 * short list worth a single-field write path.
 */
export interface CommonToggleDef {
  /** Stable id — the route param, the `RecentEntry.toggleId`, and the search result's dedupe key. */
  id: string;
  /** Top-level `siteSettings` key; the written path is always `{group}.enabled`. */
  group: string;
  label: string;
  keywords?: string[];
}

export const COMMON_TOGGLES: CommonToggleDef[] = [
  {
    id: "maintenance-mode",
    group: "maintenance",
    label: "Maintenance mode",
    keywords: ["down", "closed", "offline", "site settings"],
  },
  {
    id: "buyer-seller-messaging",
    group: "chat",
    label: "Buyer-seller messaging",
    keywords: ["chat", "messages", "messaging", "site settings"],
  },
  {
    id: "customer-assistant",
    group: "assistant",
    label: "Customer assistant",
    keywords: ["ai", "chatbot", "help widget", "assistant", "site settings"],
  },
];

export function commonToggleById(id: string): CommonToggleDef | undefined {
  return COMMON_TOGGLES.find((t) => t.id === id);
}

export const COMMON_TOGGLE_IDS = COMMON_TOGGLES.map((t) => t.id);
