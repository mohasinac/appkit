/*
 * WHY: "It should be searchable — if I search for the maintenance toggle it
 *      should find it." A nav-only index cannot: the maintenance toggle is
 *      not a page, it is a control on tab ⓵ of an 1800-line settings screen,
 *      and the only thing naming it is a `<Toggle label="Maintenance mode">`
 *      inside that screen's JSX.
 * WHAT: Track B — the declarative map of settings and toggles, each with the
 *       `?tab=`/`#anchor` that reaches the control itself.
 *
 * ## Why this is declared rather than derived
 *
 * Track A (`FieldUiMeta.index`) covers every schema-driven form for free. It
 * yields **nothing** here, because `AdminSiteSettingsView` is not schema-driven
 * — it is ~160 controls bound to individual `useState` calls, and it is on
 * W8's tabbing list precisely because of that. Waiting for the derivation
 * would mean the headline request — find the maintenance toggle — ships last.
 *
 * So this is a hand-written map, and it is the ONE in this plan that is
 * defensible: there is no existing array it duplicates. `audit-nav-metadata`'s
 * sibling check keeps its `tab` values inside `SiteSettingsTabId`, so the half
 * that CAN drift is the half that is guarded.
 *
 * ## An anchor is CLAIMED, not assumed
 *
 * A deep link to `#setting-maintenance-mode` that matches no `id=` in the DOM
 * scrolls nowhere and reads as the search having missed — so an entry opts in
 * with `anchored: true`, and `audit-action-index` checks that the id exists.
 * Everything else deep-links to its TAB, which is a smaller promise ("this
 * lives on the Fees tab") and one the page can keep.
 *
 * The first run of that audit reported thirteen dead anchors, because this
 * file declared twenty-two entries while the view carried nine ids. That is
 * the rule doing its job on the commit that introduced it.
 *
 * EXPORTS: SITE_SETTINGS_ENTRIES, deriveSettingsEntries
 *
 * @tag domain:search
 * @tag layer:shared
 * @tag pattern:registry
 * @tag access:isomorphic
 * @tag consumers:action index
 * @tag sideEffects:none
 */

import type { SiteSettingsTabId } from "../../admin/constants/site-settings-tabs";
import type { ActionIndexEntry } from "./types";

/** One control on the site-settings screen. */
export interface SettingsIndexSource {
  /** Slug — becomes both the entry id and the `#anchor`. */
  slug: string;
  label: string;
  description: string;
  keywords: string[];
  tab: SiteSettingsTabId;
  /** `toggle` for an on/off switch, `setting` for a value. */
  kind: "toggle" | "setting";
  /**
   * Whether the view renders `id="setting-{slug}"` for this control.
   *
   * 🛑 Opt-in, and audited. An anchor that matches no `id=` in the DOM scrolls
   * nowhere and reads as the search having missed — so claiming one you have
   * not added is worse than not claiming it. An entry without one deep-links
   * to its TAB, which is truthful: "this lives on the Fees tab" is a smaller
   * promise than "here is the control", and it is one the page can keep.
   */
  anchored?: boolean;
}

/**
 * The controls worth finding.
 *
 * Deliberately not all ~160: a search result list is only useful while it is
 * short, and "Hero title" is not something anyone hunts for — they open the
 * About tab and see it. What is here is what someone arrives ALREADY looking
 * for, usually in a hurry, and usually not knowing which tab it is filed under.
 */
export const SITE_SETTINGS_ENTRIES: readonly SettingsIndexSource[] = [
  {
    slug: "maintenance-mode",
    anchored: true,
    label: "Maintenance mode",
    description: "Take the site offline for visitors and show a message instead.",
    keywords: ["offline", "down for maintenance", "close the site", "under construction"],
    tab: "branding",
    kind: "toggle",
  },
  {
    slug: "maintenance-message",
    label: "Maintenance message",
    description: "What visitors see while the site is in maintenance mode.",
    keywords: ["offline message", "downtime notice"],
    tab: "branding",
    kind: "setting",
  },
  {
    slug: "announcement-bar",
    anchored: true,
    label: "Announcement bar",
    description: "Show a message across the top of every page.",
    keywords: ["banner", "notice", "top bar", "sale banner"],
    tab: "announcement",
    kind: "toggle",
  },
  {
    slug: "robots-noindex",
    anchored: true,
    label: "Hide from search engines",
    description: "Stop Google indexing the site. Use carefully — recovery is slow.",
    keywords: ["noindex", "google", "seo", "deindex", "hide from google"],
    tab: "seo",
    kind: "toggle",
  },
  {
    slug: "razorpay-enabled",
    anchored: true,
    label: "Online payments (Razorpay)",
    description: "Accept cards and UPI through Razorpay. Off by default; manual payment is the default.",
    keywords: ["card payments", "razorpay", "online payment", "gateway", "upi"],
    tab: "fees",
    kind: "toggle",
  },
  {
    slug: "manual-payment-enabled",
    anchored: true,
    label: "Manual UPI / bank transfer",
    description: "Let buyers pay by transfer and upload proof for review.",
    keywords: ["upi", "bank transfer", "manual payment", "proof"],
    tab: "fees",
    kind: "toggle",
  },
  {
    slug: "cod-enabled",
    anchored: true,
    label: "Cash on delivery",
    description: "Let buyers pay when the parcel arrives.",
    keywords: ["cod", "cash on delivery", "pay on delivery"],
    tab: "fees",
    kind: "toggle",
  },
  {
    slug: "platform-commission",
    label: "Platform commission",
    description: "What the platform takes from each sale, and its cap.",
    keywords: ["commission", "our cut", "platform fee", "take rate"],
    tab: "fees",
    kind: "setting",
  },
  {
    slug: "google-analytics",
    label: "Google Analytics",
    description: "The GA4 measurement id used for site traffic.",
    keywords: ["ga4", "analytics id", "tracking", "measurement id", "google"],
    tab: "integrations",
    kind: "setting",
  },
  {
    slug: "facebook-pixel",
    label: "Facebook Pixel",
    description: "The Meta Pixel id used for ad attribution.",
    keywords: ["meta pixel", "facebook", "ads tracking", "conversion"],
    tab: "integrations",
    kind: "setting",
  },
  {
    slug: "free-shipping-threshold",
    label: "Free shipping threshold",
    description: "The order value above which delivery is free.",
    keywords: ["free delivery", "shipping over", "minimum for free shipping"],
    tab: "shipping",
    kind: "setting",
  },
  {
    slug: "bid-increment",
    label: "Minimum bid increment",
    description: "The smallest amount a new bid must beat the current one by.",
    keywords: ["bidding step", "increment", "auction minimum"],
    tab: "auction",
    kind: "setting",
  },
  {
    slug: "anti-sniping",
    label: "Anti-sniping extension",
    description: "Extend an auction when a bid lands in its final seconds.",
    keywords: ["sniping", "last second bid", "extend auction", "going going gone"],
    tab: "auction",
    kind: "setting",
  },
  {
    slug: "email-notifications",
    anchored: true,
    label: "Email notifications",
    description: "Whether the platform sends email at all.",
    keywords: ["email", "resend", "transactional email", "stop emails"],
    tab: "notifications",
    kind: "toggle",
  },
  {
    slug: "whatsapp-notifications",
    anchored: true,
    label: "WhatsApp notifications",
    description: "Send order updates over WhatsApp.",
    keywords: ["whatsapp", "order updates", "meta"],
    tab: "notifications",
    kind: "toggle",
  },
  {
    slug: "daily-digest",
    anchored: true,
    label: "Daily status digest",
    description: "A once-a-day operations summary to the admin inbox.",
    keywords: ["digest", "daily email", "summary", "ops report"],
    tab: "notifications",
    kind: "toggle",
  },
  {
    slug: "emi-threshold",
    label: "EMI eligibility threshold",
    description: "The order value above which instalments are offered.",
    keywords: ["instalments", "installments", "emi minimum", "pay monthly"],
    tab: "emi",
    kind: "setting",
  },
  {
    slug: "gst-rates",
    label: "GST rates and HSN defaults",
    description: "The tax rates applied to listings, and the fallback HSN code.",
    keywords: ["tax", "gst", "hsn", "vat"],
    tab: "gst",
    kind: "setting",
  },
  {
    slug: "gstin",
    label: "GSTIN and registered business",
    description: "The registration number and legal address printed on invoices.",
    keywords: ["gstin", "tax number", "registered address", "legal name"],
    tab: "legal",
    kind: "setting",
  },
  {
    slug: "enabled-listing-types",
    label: "Enabled listing types",
    description: "Which kinds of listing sellers may create.",
    keywords: ["auctions off", "disable pre-orders", "listing types", "turn off"],
    tab: "listings",
    kind: "toggle",
  },
  {
    slug: "watermark",
    label: "Photo watermark",
    description: "The mark stamped onto uploaded product photos.",
    keywords: ["watermark", "logo on photos", "protect images"],
    tab: "watermark",
    kind: "setting",
  },
  {
    slug: "upload-limits",
    label: "Upload and listing limits",
    description: "Maximum file size, image count and per-account listing caps.",
    keywords: ["max upload", "file size", "how many listings", "quota", "limit"],
    tab: "limits",
    kind: "setting",
  },
];

/**
 * The settings entries, as index entries.
 *
 * `deepLink` carries the whole query-and-hash — `?tab=fees#setting-cod-enabled`
 * — rather than just the tab, because landing on the right tab and leaving the
 * reader to find the control among forty others is most of the way to not
 * having searched at all.
 */
export function deriveSettingsEntries(
  settingsHref: string,
  requiredPermission = "settings:read",
): ActionIndexEntry[] {
  return SITE_SETTINGS_ENTRIES.map((entry) => ({
    id: `admin:${entry.kind}:${entry.slug}`,
    kind: entry.kind,
    portal: "admin" as const,
    label: entry.label,
    description: entry.description,
    keywords: entry.keywords,
    href: settingsHref,
    deepLink: entry.anchored
      ? `?tab=${entry.tab}#setting-${entry.slug}`
      : `?tab=${entry.tab}`,
    sectionPath: "Admin › System › Site Settings",
    requiredPermission,
    /*
     * Above nav entries. Someone searching "maintenance" wants the toggle, not
     * the settings page it lives on — and the page will also match, on its own
     * description, so without this the container outranks the thing.
     */
    weight: 20,
  }));
}
