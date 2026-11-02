/**
 * TOGGLE_CATALOG — 1A-vi. Replaces `common-toggles.ts`'s hand-typed 3-entry
 * array with the full, curated set of site-wide boolean switches on
 * `SiteSettingsDocument`: payments, fee add-ons, tax, messaging channels,
 * maintenance, chat, the assistant, support, the announcement bar — the
 * owner's own "everything disableable, header to footer."
 *
 * 🛑 NOT build-time generated from the schema, deliberately. A brace-depth
 * scan over a 1700-line interface cannot reliably tell a genuine top-level
 * feature toggle (`chat.enabled`) from a config detail nested the same way
 * (a color-overlay flag two levels deep) — confirmed during this phase's own
 * discovery pass, which found `features.enabled` as a false positive (an
 * array ITEM's own field, not a singleton group — and the whole `features`
 * array is itself dead code, zero callers outside its own repository
 * methods, flagged for Phase 8B deletion). `scripts/find-toggle-fields.mjs`
 * is the discovery tool; this file is the human-curated result, kept honest
 * by `audit-toggle-catalog-drift.mjs` re-running that same heuristic and
 * failing if a listed `dotPath` stops resolving, OR if a newly-discovered
 * candidate isn't yet triaged into (or explicitly excluded from) this list.
 *
 * The server-side write path (`PATCH /api/admin/site-settings/common-toggle/[id]`)
 * still validates `id` against this closed array — a client cannot name an
 * arbitrary `siteSettings.*` path to flip, same closed-set safety
 * `common-toggles.ts` always had, just backed by 18 real entries instead of 3.
 *
 * @tag domain:site-settings
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:none
 */

import type { ActionConfirmation } from "../../actions/action-registry";

export interface ToggleCatalogEntry {
  /** Stable id — the route param, `RecentEntry.toggleId`, the search result's dedupe key. */
  id: string;
  /**
   * The written path, always `{dotPath} = enabled`. For a `{group}.enabled`
   * shape, `dotPath` IS `"{group}.enabled"`; for a flat `{group}.fooEnabled`
   * shape, it is `"{group}.fooEnabled"` — either way, one dotted path,
   * applied via `updateSingleton()`'s existing nested-write support
   * (`toDottedPaths`), never a hand-built `{[group]: {enabled}}` object that
   * only fits the first shape.
   */
  dotPath: string;
  label: string;
  /** Top-level `siteSettings` key — for display grouping only, not the write path. */
  group: string;
  keywords?: string[];
  /**
   * Search tiebreaker (1A-vi/9-ii, the Android-Settings reference: "only the
   * important cards and toggles show up over the garbage stuff"). Default 0.
   * Applied ONLY when `rankNavSearchResults`' match-quality score ties —
   * never overrides an exact label match with a merely-important fuzzy one.
   */
  priority?: number;
  /**
   * 9K (overhaul brief, Phase 9-ii) — a mutating card/search-result toggle
   * shows this confirm dialog before writing, same `ActionConfirmation`
   * shape Rule #7 already requires for destructive `ActionDef`s. Set only on
   * entries with a real external consequence (a site-wide gate, a payment
   * method buyers rely on mid-checkout) — most toggles are genuinely inert
   * and stay unconfirmed, matching Rule #7's own "skipped for anything
   * genuinely inert" standard.
   */
  confirmation?: ActionConfirmation;
}

export const TOGGLE_CATALOG: ToggleCatalogEntry[] = [
  {
    id: "maintenance-mode",
    dotPath: "maintenance.enabled",
    label: "Maintenance mode",
    group: "maintenance",
    keywords: ["down", "closed", "offline", "site settings"],
    priority: 10,
    confirmation: {
      title: "Change maintenance mode?",
      body: "Turning this on takes the whole storefront offline for every visitor until it's turned back off. Turning it off brings the site back live immediately.",
      confirmLabel: "Change it",
      confirmKind: "danger",
    },
  },
  {
    id: "razorpay-enabled",
    dotPath: "payment.razorpayEnabled",
    label: "Razorpay enabled",
    group: "payment",
    keywords: ["payment", "gateway", "card", "upi", "netbanking", "checkout"],
    priority: 8,
    confirmation: {
      title: "Change Razorpay?",
      body: "Disabling this removes Razorpay as a payment option at checkout for every buyer — they'll only see whichever other methods are still enabled.",
      confirmLabel: "Change it",
      confirmKind: "danger",
    },
  },
  {
    id: "phonepe-enabled",
    dotPath: "payment.phonepeEnabled",
    label: "PhonePe enabled",
    group: "payment",
    keywords: ["payment", "gateway", "upi", "checkout"],
    priority: 8,
    confirmation: {
      title: "Change PhonePe?",
      body: "Disabling this removes PhonePe as a payment option at checkout for every buyer — they'll only see whichever other methods are still enabled.",
      confirmLabel: "Change it",
      confirmKind: "danger",
    },
  },
  {
    id: "cashfree-enabled",
    dotPath: "payment.cashfreeEnabled",
    label: "Cashfree Payments enabled",
    group: "payment",
    keywords: ["payment", "gateway", "split settlement", "checkout"],
    priority: 8,
    confirmation: {
      title: "Change Cashfree Payments?",
      body: "Disabling this removes Cashfree as a payment option at checkout for every buyer — they'll only see whichever other methods are still enabled.",
      confirmLabel: "Change it",
      confirmKind: "danger",
    },
  },
  {
    id: "cod-enabled",
    dotPath: "payment.codEnabled",
    label: "Cash on delivery enabled",
    group: "payment",
    keywords: ["cod", "payment", "checkout"],
    priority: 7,
  },
  {
    id: "upi-manual-enabled",
    dotPath: "payment.upiManualEnabled",
    label: "Manual UPI/bank transfer enabled",
    group: "payment",
    keywords: ["payment", "manual", "upi", "bank transfer", "checkout"],
    priority: 6,
  },
  {
    id: "emi-enabled",
    dotPath: "emi.enabled",
    label: "EMI (installments) enabled",
    group: "emi",
    keywords: ["emi", "installment", "checkout", "payment"],
    priority: 6,
  },
  {
    id: "gst-enabled",
    dotPath: "gst.enabled",
    label: "GST enabled",
    group: "gst",
    keywords: ["gst", "tax", "compliance"],
    priority: 7,
  },
  {
    id: "whatsapp-notify-fee-enabled",
    dotPath: "commissions.whatsappNotifyFeeEnabled",
    label: "WhatsApp order updates add-on enabled",
    group: "commissions",
    keywords: ["whatsapp", "add-on", "fee", "checkout"],
    priority: 3,
  },
  {
    id: "gift-wrap-fee-enabled",
    dotPath: "commissions.giftWrapFeeEnabled",
    label: "Gift wrap add-on enabled",
    group: "commissions",
    keywords: ["gift wrap", "add-on", "fee", "checkout"],
    priority: 3,
  },
  {
    id: "shipment-protection-fee-enabled",
    dotPath: "commissions.shipmentProtectionFeeEnabled",
    label: "Shipment protection add-on enabled",
    group: "commissions",
    keywords: ["protection", "insurance", "add-on", "fee", "checkout"],
    priority: 3,
  },
  {
    id: "sale-protection-fee-enabled",
    dotPath: "commissions.saleProtectionFeeEnabled",
    label: "Sale protection add-on enabled",
    group: "commissions",
    keywords: ["protection", "insurance", "add-on", "fee", "checkout"],
    priority: 3,
  },
  {
    id: "messaging-email-enabled",
    dotPath: "messaging.emailEnabled",
    label: "User-facing email enabled",
    group: "messaging",
    keywords: ["email", "notifications", "resend"],
    priority: 5,
  },
  {
    id: "messaging-whatsapp-enabled",
    dotPath: "messaging.whatsappEnabled",
    label: "User-facing WhatsApp enabled",
    group: "messaging",
    keywords: ["whatsapp", "notifications"],
    priority: 5,
  },
  {
    id: "buyer-seller-messaging",
    dotPath: "chat.enabled",
    label: "Buyer-seller messaging",
    group: "chat",
    keywords: ["chat", "messages", "messaging", "site settings"],
    priority: 7,
  },
  {
    id: "customer-assistant",
    dotPath: "assistant.enabled",
    label: "Customer assistant",
    group: "assistant",
    keywords: ["ai", "chatbot", "help widget", "assistant", "site settings"],
    priority: 7,
  },
  {
    id: "support-enabled",
    dotPath: "support.enabled",
    label: "Support tickets enabled",
    group: "support",
    keywords: ["support", "tickets", "help"],
    priority: 6,
  },
  {
    id: "announcement-bar-enabled",
    dotPath: "announcementBar.enabled",
    label: "Announcement bar enabled",
    group: "announcementBar",
    keywords: ["banner", "announcement", "site settings"],
    priority: 4,
  },
];

export function toggleCatalogById(id: string): ToggleCatalogEntry | undefined {
  return TOGGLE_CATALOG.find((t) => t.id === id);
}

export const TOGGLE_CATALOG_IDS = TOGGLE_CATALOG.map((t) => t.id);
