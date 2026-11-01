/**
 * Phase 10 ("widget descriptors") — the READ-ONLY counterpart to
 * `common-toggles.ts`. Every entry here is a site-settings toggle OUTSIDE the
 * closed, write-capable `COMMON_TOGGLES` registry, made findable + pinnable
 * on the dashboard without opening a second write path into the 20-tab form.
 *
 * 🛑 Selecting a card never flips anything. It navigates to
 * `/admin/site-settings?tab={tab}#{anchorId}` and shows the CURRENT value as
 * plain text, read from the already-fetched `["admin","site-settings"]`
 * query cache — no new fetch, no new write endpoint, none of the form's
 * cross-field validation (gateway ordering, COD/manual-payment dependencies)
 * touched.
 *
 * Every `anchorId` below is verified against a real `id="setting-*"` literal
 * in `AdminSiteSettingsView.tsx` (2026-11-02) — 13 anchors existed, all
 * reused here; none invented. `tab` is the real `<TabsContent value="...">`
 * each anchor falls inside, read directly off the file rather than guessed
 * from the toggle's apparent subject (payment-gateway toggles are inside the
 * `shipping` tab in this codebase, not a `payments` tab that doesn't exist —
 * confirmed by line range, not assumed from the label).
 *
 * `SETTINGS_PREVIEW_IDS` and `COMMON_TOGGLE_IDS` must stay disjoint — this is
 * what keeps "exactly one writable path" true. Enforced by
 * `audit-widget-descriptor-sync.mjs` R3, not just by this comment.
 */
import { COMMON_TOGGLE_IDS } from "./common-toggles";

export interface SettingsPreviewDef {
  /** Stable id — the `RecentEntry.settingId` and the search result's dedupe key. */
  id: string;
  /** Literal `id="setting-*"` string this must match inside `AdminSiteSettingsView.tsx`. */
  anchorId: string;
  /** The real `<TabsContent value="...">` the anchor falls inside. */
  tab: string;
  label: string;
  keywords?: string[];
}

export const SETTINGS_PREVIEW: SettingsPreviewDef[] = [
  {
    id: "announcement-bar",
    anchorId: "setting-announcement-bar",
    tab: "announcement",
    label: "Announcement bar",
    keywords: ["banner", "top bar", "site settings"],
  },
  {
    id: "robots-noindex",
    anchorId: "setting-robots-noindex",
    tab: "seo",
    label: "Robots noindex",
    keywords: ["seo", "search indexing", "google", "site settings"],
  },
  {
    id: "razorpay-enabled",
    anchorId: "setting-razorpay-enabled",
    tab: "shipping",
    label: "Razorpay enabled",
    keywords: ["payment", "gateway", "card", "upi", "netbanking", "site settings"],
  },
  {
    id: "phonepe-enabled",
    anchorId: "setting-phonepe-enabled",
    tab: "shipping",
    label: "PhonePe enabled",
    keywords: ["payment", "gateway", "upi", "site settings"],
  },
  {
    id: "cashfree-enabled",
    anchorId: "setting-cashfree-enabled",
    tab: "shipping",
    label: "Cashfree enabled",
    keywords: ["payment", "gateway", "split settlement", "site settings"],
  },
  {
    id: "manual-payment-enabled",
    anchorId: "setting-manual-payment-enabled",
    tab: "shipping",
    label: "Manual UPI/bank transfer enabled",
    keywords: ["payment", "manual", "upi", "bank transfer", "site settings"],
  },
  {
    id: "cod-enabled",
    anchorId: "setting-cod-enabled",
    tab: "shipping",
    label: "Cash on delivery enabled",
    keywords: ["payment", "cod", "cash", "site settings"],
  },
  {
    id: "email-notifications",
    anchorId: "setting-email-notifications",
    tab: "notifications",
    label: "Email notifications",
    keywords: ["email", "resend", "site settings"],
  },
  {
    id: "daily-digest",
    anchorId: "setting-daily-digest",
    tab: "notifications",
    label: "Daily status digest",
    keywords: ["digest", "email", "staff", "site settings"],
  },
  {
    id: "whatsapp-notifications",
    anchorId: "setting-whatsapp-notifications",
    tab: "notifications",
    label: "WhatsApp notifications",
    keywords: ["whatsapp", "notifications", "site settings"],
  },
];

export const SETTINGS_PREVIEW_IDS = SETTINGS_PREVIEW.map((s) => s.id);

/** Build-time + runtime check that the two registries never overlap — see audit R3 for the enforced version. */
export const SETTINGS_PREVIEW_COMMON_TOGGLE_OVERLAP = SETTINGS_PREVIEW_IDS.filter((id) =>
  (COMMON_TOGGLE_IDS as string[]).includes(id),
);

export function settingsPreviewById(id: string): SettingsPreviewDef | undefined {
  return SETTINGS_PREVIEW.find((s) => s.id === id);
}
