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
import type {
  NotificationChannelConfig,
  SiteSettingsDocument,
} from "../../../../features/admin/schemas/firestore";
import type { MediaVideoWatermark } from "../../../../features/media/MediaVideo";

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
   * Which listing types the site offers — the client needs this to avoid
   * rendering a browse tab for a type nothing will return.
   *
   * Deliberately NOT the whole `listings` block: `categoryTypes` has no client
   * reader. This was `featureFlags.listingTypes` until that group was deleted
   * on 2026-08-29; the projection stayed narrow for the same reason it always
   * was — a public payload carries what a client demonstrably reads, nothing
   * more (Root Cause #70).
   */
  listings: {
    listingTypes?: NonNullable<SiteSettingsDocument["listings"]>["listingTypes"];
  };
  notificationChannels?: NotificationChannelConfig;
  announcementBar?: SiteSettingsDocument["announcementBar"];
  navConfig?: SiteSettingsDocument["navConfig"];
  actionConfig?: SiteSettingsDocument["actionConfig"];
  background?: SiteSettingsDocument["background"];
  watermark?: SiteSettingsDocument["watermark"];
  /** Derived, not a stored field — the resolved marker → wordmark → text chain. */
  effectiveWatermark?: MediaVideoWatermark;
}
