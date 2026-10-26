/**
 * The public shape of site settings — the ONLY fields
 * `GET /api/site-settings` may return to an unauthenticated caller.
 *
 * This type lives under `_internal/shared/` rather than beside the server
 * adapter because client code consumes it (`useSiteSettings<PublicSiteSettings>()`),
 * and client files must not import from `_internal/server`.
 *
 * Additive by explicit triage only: see `PUBLIC_SITE_SETTINGS_FIELDS` /
 * `PRIVATE_SITE_SETTINGS_FIELDS` in
 * `../../../server/features/site-settings/adapters.ts`, enforced by
 * `scripts/audit-public-projection-parity.mjs`. Adding a field here without a
 * proven client reader is how the endpoint drifted in the first place.
 */
import type { SiteSettingsDocument } from "../../../../features/admin/schemas/firestore";
import type { MediaVideoWatermark } from "../../../../features/media/MediaVideo";

/** The only notification-channel facts a browser is given: is each channel on. */
export interface PublicNotificationChannels {
  email: { enabled: boolean };
  whatsapp: { enabled: boolean };
  sms: { enabled: boolean };
}

export interface PublicSiteSettings {
  /** Support channels shown to buyers. Deliberately NOT the full `contact` — `address` and `upiVpa` stay server-side. */
  contact: {
    email: string;
    phone: string;
    whatsappNumber: string;
  };
  /** Deliberately NOT the full `payment` block — only the checkout OTP threshold has a client reader. */
  payment: {
    otpCheckoutThreshold?: number;
  };
  /**
   * Which listing types the site offers, and which browse sections are open —
   * the client needs both to avoid rendering a nav entry or a browse tab that
   * leads somewhere nothing will return.
   *
   * Deliberately NOT the whole `listings` block: `categoryTypes` has no client
   * reader. This was `featureFlags.listingTypes` until that group was deleted
   * on 2026-08-29; the projection stayed narrow for the same reason it always
   * was — a public payload carries what a client demonstrably reads, nothing
   * more (Root Cause #70).
   *
   * `browsePages` HAS a client reader and must be published: `LayoutShellClient`
   * filters the navbar, the sidebar, the mobile sheet and the footer from it.
   * Withholding it would leave every link to a closed section in the chrome,
   * pointing at a route that now 404s — a dead-end CTA on every page of the
   * site, which is a worse outcome than not having the flag at all.
   */
  listings: {
    listingTypes?: NonNullable<SiteSettingsDocument["listings"]>["listingTypes"];
    browsePages?: NonNullable<SiteSettingsDocument["listings"]>["browsePages"];
  };
  /** D9 — off by default; `enabled: false` is emitted rather than omitted, same `always-present` reasoning as `disabledRoutes` below. */
  chat?: { enabled: boolean };
  /**
   * Is the support desk reachable — read by `UserLayoutClient`, a client
   * component. Narrowed to the one boolean rather than passed by reference,
   * so a field added to the document's `support` group later is not published
   * by accident; `PUBLIC_SITE_SETTINGS_FIELDS` carries the same caveat beside
   * its entry. Optional here because the group is absent on a settings
   * document written before it existed.
   */
  support?: { enabled: boolean };
  /**
   * The browser-side search index kill switch. **ON by default** — the
   * projection emits `indexEnabled: doc.search?.indexEnabled !== false`, so
   * an unseeded settings document and an absent group both mean "search
   * works". The property itself is optional only because an OLD cached
   * `/api/site-settings` response predates the field; `useSearchIndex`
   * therefore reads it as `!== false` a second time rather than `=== true`.
   */
  search?: { indexEnabled: boolean };
  /**
   * 🛑 NARROWER than `NotificationChannelConfig` on purpose, and it must stay
   * that way. The full config carries `minPriority` and a `types[]` allow-list
   * naming exactly which notification types each channel carries — operational
   * routing detail that no browser reads and that an anonymous caller has no
   * business enumerating.
   *
   * `inApp` is deliberately absent too: it is always on and nothing renders a
   * toggle for it.
   *
   * Widening this back to `NotificationChannelConfig` re-publishes the lot by
   * the act of widening, which is the failure Root Cause #70 records.
   */
  notificationChannels?: PublicNotificationChannels;
  announcementBar?: SiteSettingsDocument["announcementBar"];
  navConfig?: SiteSettingsDocument["navConfig"];
  actionConfig?: SiteSettingsDocument["actionConfig"];
  background?: SiteSettingsDocument["background"];
  watermark?: SiteSettingsDocument["watermark"];
  /**
   * Routes an admin has switched off. Read by `src/proxy.ts`, which rewrites a
   * disabled path to the 404 page.
   *
   * 🛑 Not optional, and always emitted (defaulted to `[]`). The proxy fetches
   * this over HTTP and fails OPEN on a missing value, so the difference between
   * "no routes disabled" and "the field never arrived" is invisible at runtime —
   * which is exactly how this capability sat dead after Root Cause #82 moved the
   * gate out of the root layout. A key that is always present makes the two
   * distinguishable from the wire alone.
   */
  disabledRoutes: string[];
  /** Derived, not a stored field — the resolved marker → wordmark → text chain. */
  effectiveWatermark?: MediaVideoWatermark;
  /**
   * Which public browse surfaces currently have something in them. Derived
   * from the `surfaceCounts/global` document, not a `siteSettings` field —
   * carried here because this payload is already the channel the navbar,
   * footer and sidebar read their visibility rules from, so adding a second
   * client fetch for one more rule would be a request per page load.
   *
   * 🛑 OMITTED ENTIRELY when the counts document has not been written yet,
   * and every reader must treat that as "show everything". A present-but-empty
   * object would be indistinguishable from "measured, and all zero" — which is
   * the shape that hides the whole catalogue. `isListingSurfaceVisible`
   * encodes the rule; do not re-derive it at a call site.
   */
  surfaceCounts?: {
    listingTypes?: Record<string, number>;
    surfaces?: Record<string, number>;
  };
}
