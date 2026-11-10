/**
 * Cookie consent — the banner, the preferences panel, the gate and the
 * registry the policy page is generated from.
 *
 * Consumers can import this barrel or the individual modules; the barrel
 * exists so a consumer adding consent does not have to know which of the
 * three files a given symbol lives in.
 */

export {
  CookieConsentBanner,
  CookieConsentPreferences,
  DEFAULT_COOKIE_CONSENT_COPY,
  type CookieConsentBannerProps,
  type CookieConsentPreferencesProps,
  type CookieConsentCopy,
  type ConsentCategoryCopy,
} from "./CookieConsent";

export { useCookieConsent, type UseCookieConsentResult, type UseCookieConsentOptions } from "./useCookieConsent";

export {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE_SECONDS,
  COOKIE_REGISTRY,
  OPTIONAL_CONSENT_CATEGORIES,
  UNDECIDED,
  cookiesInCategory,
  hasConsentFor,
  parseConsentValue,
  readConsent,
  resolveConsentCookieDomain,
  serializeConsentValue,
  subscribeToConsent,
  writeConsent,
  type ConsentCategory,
  type ConsentState,
  type CookieRegistryEntry,
  type WriteConsentOptions,
} from "./consent-store";
