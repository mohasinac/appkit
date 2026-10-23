/*
 * WHY: The 19 site-settings tabs were a `[value, label]` array literal written
 *      inline in the middle of an 1800-line component's JSX. Nothing else could
 *      read them, so `?tab=` deep links had no union to be validated against —
 *      and the view did not accept `?tab=` at all, which is why "search for
 *      maintenance and land on the maintenance toggle" had nowhere to land.
 * WHAT: The tab union, and the metadata that lets each tab be found by what it
 *       CONTAINS rather than by its own name.
 *
 * ## Why the descriptions matter more here than in the sidebar
 *
 * A settings tab is the one place where the label is reliably NOT what someone
 * searches for. Nobody looks for "Integrations"; they look for "Google
 * Analytics". Nobody looks for "Limits"; they look for "maximum upload size".
 * The tab name is an filing decision, and the search has to survive it.
 *
 * EXPORTS: SITE_SETTINGS_TABS, SITE_SETTINGS_TAB_IDS, type SiteSettingsTabId
 *
 * @tag domain:admin
 * @tag layer:constants
 * @tag pattern:registry
 * @tag access:isomorphic
 * @tag consumers:AdminSiteSettingsView,action index
 * @tag sideEffects:none
 */

export interface SiteSettingsTab {
  id: string;
  /** The label on the tab, numbering included — it is a long strip. */
  label: string;
  /** What lives in here, for anyone who does not know the tab's name. */
  description: string;
  keywords: string[];
}

export const SITE_SETTINGS_TABS = [
  {
    id: "about",
    label: "⓪ About",
    description: "The About page: hero, mission, values, milestones and the team.",
    keywords: ["about us", "team", "mission", "our story", "milestones"],
  },
  {
    id: "branding",
    label: "① Branding",
    description: "Site name, tagline, logo and favicon.",
    keywords: ["logo", "favicon", "site name", "tagline", "brand"],
  },
  {
    id: "appearance",
    label: "② Appearance",
    description: "Colours, backgrounds and the default light or dark mode.",
    keywords: ["colours", "colors", "background", "dark mode", "look"],
  },
  {
    id: "themes",
    label: "②ᵃ Themes",
    description: "Create and edit colour themes, and pick the default for each mode.",
    keywords: ["theme", "palette", "colours", "dark theme", "light theme"],
  },
  {
    id: "announcement",
    label: "③ Announcement",
    description: "The banner across the top of every page.",
    keywords: ["banner", "notice", "message bar", "top bar"],
  },
  {
    id: "seo",
    label: "④ SEO",
    description: "Default page titles, descriptions, and whether search engines may index the site.",
    keywords: ["google", "meta description", "noindex", "search engines", "sitemap"],
  },
  {
    id: "contact",
    label: "⑤ Contact & Social",
    description: "Support email, phone, address and every social profile link.",
    keywords: ["email", "phone", "instagram", "whatsapp number", "social links"],
  },
  {
    id: "watermark",
    label: "⑥ Watermark",
    description: "The mark stamped onto uploaded product photos.",
    keywords: ["logo on images", "photo watermark", "branding images"],
  },
  {
    id: "fees",
    label: "⑦ Fees",
    description: "Platform commission, add-on charges, COD handling and the payout split.",
    keywords: ["commission", "charges", "cod fee", "gift wrap", "platform fee"],
  },
  {
    id: "integrations",
    label: "⑧ Integrations",
    description: "Google Analytics, Facebook Pixel, Tag Manager and API credentials.",
    keywords: ["google analytics", "ga4", "facebook pixel", "gtm", "api keys", "tracking"],
  },
  {
    id: "shipping",
    label: "⑨ Shipping",
    description: "Default delivery charges, free-shipping threshold and dispatch times.",
    keywords: ["delivery", "postage", "free shipping", "courier", "dispatch"],
  },
  {
    id: "auction",
    label: "⑩ Auction",
    description: "Bid increments, anti-sniping extension and reserve-price rules.",
    keywords: ["bidding", "increment", "sniping", "reserve price", "extension"],
  },
  {
    id: "limits",
    label: "⑪ Limits",
    description: "Upload sizes, listing counts and per-account caps.",
    keywords: ["maximum", "upload size", "cap", "quota", "how many"],
  },
  {
    id: "legal",
    label: "⑫ Legal",
    description: "Terms, privacy policy, refund policy and the GST registration details.",
    keywords: ["terms", "privacy", "policy", "gstin", "refund policy", "compliance"],
  },
  {
    id: "whatsapp",
    label: "⑬ WhatsApp",
    description: "WhatsApp Business credentials and which messages go out over it.",
    keywords: ["whatsapp", "meta", "business api", "order updates"],
  },
  {
    id: "notifications",
    label: "⑭ Notifications",
    description: "Which channels are on — email, WhatsApp, SMS — and the daily digest.",
    keywords: ["email", "sms", "alerts", "digest", "notify"],
  },
  {
    id: "procurement",
    label: "⑮ Procurement",
    description: "Labour rate and the defaults used to price inbound shipments.",
    keywords: ["labour rate", "labor", "import", "landed cost", "supplier"],
  },
  {
    id: "emi",
    label: "⑯ EMI",
    description: "Instalment plans: eligibility threshold, tenures and the surcharge split.",
    keywords: ["instalments", "installments", "emi", "pay monthly", "finance"],
  },
  {
    id: "gst",
    label: "⑰ GST",
    description: "GST rates, HSN defaults and the registered business details.",
    keywords: ["tax", "gst", "hsn", "vat", "invoice tax"],
  },
  {
    id: "listings",
    label: "⑱ Listings",
    description: "Which listing types sellers may create, and their defaults.",
    keywords: ["listing types", "auctions on", "enable", "categories"],
  },
] as const satisfies readonly SiteSettingsTab[];

export const SITE_SETTINGS_TAB_IDS = SITE_SETTINGS_TABS.map((t) => t.id);

/**
 * The union `?tab=` is validated against.
 *
 * W7's `AIX_DEAD_DEEPLINK` check needs exactly this: a deep link naming a tab
 * that does not exist opens the settings page on its default tab and looks
 * like the search simply missed.
 */
export type SiteSettingsTabId = (typeof SITE_SETTINGS_TABS)[number]["id"];

/** Whether a `?tab=` value names a real tab. */
export function isSiteSettingsTabId(value: string | null | undefined): value is SiteSettingsTabId {
  return !!value && (SITE_SETTINGS_TAB_IDS as readonly string[]).includes(value);
}
