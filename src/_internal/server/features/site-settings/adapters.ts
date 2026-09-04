/**
 * Site-settings adapter — the allow-list projection for `GET /api/site-settings`.
 *
 * Every field of `SiteSettingsDocument` is triaged into exactly one of
 * `PUBLIC_SITE_SETTINGS_FIELDS` (mapped into the returned literal) or
 * `PRIVATE_SITE_SETTINGS_FIELDS` (with a stated reason). A field added to the
 * schema and to neither list fails
 * `scripts/audit-public-projection-parity.mjs` — new fields are private by
 * default.
 *
 * Why this replaced a deny-list (2026-08-24): the route used to spread the
 * document and delete three keys (`credentials`, `emailSettings`,
 * `legalPages`), which meant everything else was public by default and
 * edge-cached for 300s. That shipped `gst.gstin` + the registered legal name
 * and address, all 25 `commissions.*` fields, `laborRate.hourlyRate`,
 * `emi.surchargeSellerSharePercent`, `payment.adminCheckoutBypass`, and —
 * because they weren't even declared on the interface —
 * `adSettings.providerCredentials` (which the ADMIN ads endpoint bothers to
 * mask) plus every draft/paused/scheduled ad in `adSettings.inventory`.
 *
 * That last part is the argument for an allow-list over any amount of
 * deny-list discipline: a deny-list keyed on a TypeScript interface is blind
 * to fields the interface never declared. This function can only emit what it
 * names.
 *
 * NOTE: fees are deliberately NOT exposed here. Cart and checkout receive them
 * as SSR props via `toBuyerFacingFees`. If a client ever needs them from this
 * endpoint, spread `toBuyerFacingFees(doc.commissions)` into the literal below
 * and move `commissions` across to the public list — do not hand-roll a second
 * subset.
 */
import type { SiteSettingsDocument } from "../../../../features/admin/schemas/firestore";
import type { MediaVideoWatermark } from "../../../../features/media/MediaVideo";
import type { PublicSiteSettings } from "../../../shared/features/site-settings/types";

/**
 * Document fields with a proven `useSiteSettings()` reader. Every entry below
 * was traced to a call site; anything without one belongs in the private list,
 * because an unused public field is pure attack surface.
 */
export const PUBLIC_SITE_SETTINGS_FIELDS = [
  "contact", // user/orders/[id]/payment — contact.whatsappNumber (narrowed: no address/upiVpa)
  "payment", // CheckoutRouteClient — payment.otpCheckoutThreshold (narrowed)
  "listings", // useListingTypeFlags — narrowed to listings.listingTypes; categoryTypes has no client reader
  "notificationChannels", // NotificationPreferencesPanel + CheckoutRouteClient (whatsapp.otpEnabled)
  "announcementBar", // the homepage banner (AdminSiteSettingsView edits it)
  "navConfig", // NavbarWithSettings, DashboardLayoutClient
  "actionConfig", // useAuthGate
  "background", // DashboardLayoutClient (background.light / .dark)
  "watermark", // MediaVideo, as the fallback behind effectiveWatermark
] as const;

/** Everything else, with the reason it stays server-side. */
export const PRIVATE_SITE_SETTINGS_FIELDS = [
  "id", // singleton bookkeeping
  "createdAt", // bookkeeping
  "updatedAt", // bookkeeping
  "credentials", // encrypted provider secrets — never leaves the server in any form
  "emailSettings", // internal sender config + staff digest recipient addresses
  "legalPages", // served by their own pages; large HTML blobs with no client reader
  "commissions", // internal economics; the buyer-facing subset ships via toBuyerFacingFees
  "emi", // ditto — surchargeSellerSharePercent is a platform/seller revenue split
  "gst", // GSTIN, registered legal name and address
  "laborRate", // internal procurement cost basis
  "adSettings", // providerCredentials + unpublished ad inventory; /api/ads serves the filtered public view
  "integrations", // analytics/tag IDs are injected server-side into markup, not fetched by the client
  "platformLimits", // server-enforced caps; no client reader
  "auctionConfig", // read by AuctionDetailPageView, a Server Component doing its own settings read
  "disabledRoutes", // read by app/[locale]/layout.tsx (RSC) to gate routing
  "siteName", // delivered as an SSR prop / rendered server-side
  "tagline", // admin chrome only
  "motto", // rendered server-side
  "logo", // delivered as an SSR prop by app/[locale]/layout.tsx
  "favicon", // emitted by generateMetadata, server-side
  "seo", // consumed by generateMetadata, server-side
  "socialLinks", // rendered server-side in the footer
  "features", // rendered server-side
  "shipping", // rendered server-side
  "returns", // rendered server-side
  "faq", // faq.variables are interpolated server-side by /api/faqs
  "aboutContent", // rendered by the /about RSC
  "navbarConfig", // rendered server-side
  "footerConfig", // rendered server-side
  "theme", // delivered as an SSR prop to ThemeProvider by app/[locale]/layout.tsx
  "featuredResults", // rendered server-side by search
] as const;

export interface ToPublicSiteSettingsOptions {
  /**
   * The resolved marker → wordmark → text watermark chain. Injected because
   * the resolver lives in the consumer app
   * (`src/lib/watermark/resolve-effective-watermark.ts`), not in appkit.
   */
  effectiveWatermark?: MediaVideoWatermark;
}

export function toPublicSiteSettings(
  doc: SiteSettingsDocument,
  opts?: ToPublicSiteSettingsOptions,
): PublicSiteSettings {
  return {
    // Explicit sub-literals, never spreads. These two are the ones that carry
    // real weight: `contact` drops `address` + `upiVpa`, and `payment` emits
    // ONLY `otpCheckoutThreshold` — it also holds `adminCheckoutBypass` (the
    // setting that skips OTP and payment capture) and `smsVerification`, both
    // of which must never reach a client. `listings` is narrowed too:
    // `categoryTypes` has no client reader.
    contact: {
      email: doc.contact?.email ?? "",
      phone: doc.contact?.phone ?? "",
      whatsappNumber: doc.contact?.whatsappNumber ?? "",
    },
    payment: {
      otpCheckoutThreshold: doc.payment?.otpCheckoutThreshold,
    },
    listings: {
      listingTypes: doc.listings?.listingTypes,
    },
    notificationChannels: doc.notificationChannels,
    announcementBar: doc.announcementBar,
    navConfig: doc.navConfig,
    actionConfig: doc.actionConfig,
    background: doc.background,
    watermark: doc.watermark,
    effectiveWatermark: opts?.effectiveWatermark,
  };
}
