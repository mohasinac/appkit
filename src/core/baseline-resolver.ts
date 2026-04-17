/**
 * Baseline Market Resolver
 *
 * Single canonical source for all market-specific defaults (currency, locale,
 * country, phone prefix, timezone). Appkit modules read defaults from here
 * instead of hard-coding literals. Consumer projects override via
 * `configureMarketDefaults()` in their `providers.config.ts`.
 *
 * Baseline values match current letitrip.in behavior (INR / en-IN / IN / +91 / Asia/Kolkata).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketProfile {
  /** ISO 4217 currency code (e.g. "INR", "USD"). */
  currency: string;
  /** IETF locale tag for Intl formatters (e.g. "en-IN"). */
  locale: string;
  /** ISO 3166-1 alpha-2 country code (e.g. "IN"). */
  country: string;
  /** International phone prefix including "+" (e.g. "+91"). */
  phonePrefix: string;
  /** IANA timezone (e.g. "Asia/Kolkata"). */
  timezone: string;
  /** Currency symbol for quick-display use (e.g. "₹"). */
  currencySymbol: string;
}

// ---------------------------------------------------------------------------
// Baseline (letitrip-derived, immutable)
// ---------------------------------------------------------------------------

const BASELINE: Readonly<MarketProfile> = Object.freeze({
  currency: "INR",
  locale: "en-IN",
  country: "IN",
  phonePrefix: "+91",
  timezone: "Asia/Kolkata",
  currencySymbol: "₹",
});

// ---------------------------------------------------------------------------
// Runtime override store
// ---------------------------------------------------------------------------

let _overrides: Partial<MarketProfile> = {};

/**
 * Consumer projects call this once at startup (e.g. in `providers.config.ts`)
 * to override any market defaults.
 *
 * ```ts
 * import { configureMarketDefaults } from "@mohasinac/appkit/core";
 * configureMarketDefaults({ currency: "USD", locale: "en-US", country: "US", phonePrefix: "+1", timezone: "America/New_York", currencySymbol: "$" });
 * ```
 */
export function configureMarketDefaults(
  overrides: Partial<MarketProfile>,
): void {
  _overrides = { ..._overrides, ...overrides };
}

/**
 * Reset overrides back to baseline. Primarily for testing.
 */
export function resetMarketDefaults(): void {
  _overrides = {};
}

// ---------------------------------------------------------------------------
// Resolved accessors
// ---------------------------------------------------------------------------

/** Full resolved market profile (baseline + consumer overrides). */
export function getMarketProfile(): Readonly<MarketProfile> {
  return { ...BASELINE, ..._overrides };
}

/** Resolved default currency code. */
export function getDefaultCurrency(): string {
  return _overrides.currency ?? BASELINE.currency;
}

/** Resolved default locale. */
export function getDefaultLocale(): string {
  return _overrides.locale ?? BASELINE.locale;
}

/** Resolved default country code. */
export function getDefaultCountry(): string {
  return _overrides.country ?? BASELINE.country;
}

/** Resolved default phone prefix. */
export function getDefaultPhonePrefix(): string {
  return _overrides.phonePrefix ?? BASELINE.phonePrefix;
}

/** Resolved default timezone. */
export function getDefaultTimezone(): string {
  return _overrides.timezone ?? BASELINE.timezone;
}

/** Resolved default currency symbol. */
export function getDefaultCurrencySymbol(): string {
  return _overrides.currencySymbol ?? BASELINE.currencySymbol;
}
