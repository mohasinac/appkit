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
  /** Deliberately NOT the full `featureFlags` — `adminCheckoutBypass` must never be advertised publicly. */
  featureFlags: {
    listingTypes?: SiteSettingsDocument["featureFlags"]["listingTypes"];
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
