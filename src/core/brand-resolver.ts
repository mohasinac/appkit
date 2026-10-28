/**
 * The consumer's brand identity, injected once at boot.
 *
 * ── Why this seam exists ──────────────────────────────────────────────────
 *
 * `appkit.config.js → brand` is the consumer-owned owner of the site's name,
 * short name and TLD. appkit has no runtime reader for a consumer config file,
 * so — exactly as `supplier-of-record.ts` does for the statutory identity, and
 * `baseline-resolver.ts` for currency and locale — the consumer injects it.
 *
 * Measured 2026-10-29, this was the FIFTH owner problem that
 * `supplier-of-record.ts` was written to end, one field over. `brand.name` is
 * `"LetItRip"`, but five appkit modules read `NEXT_PUBLIC_SITE_NAME` directly
 * with five DIFFERENT fallbacks (`"LetItRip"`, `"App"`, `"App"`, `""`, and a
 * comment), and that env var holds `"Let It Rip India"` — which is
 * `brand.heroCaption`, not the brand name. So the checkout value-OTP message
 * and the JSON-LD `publisher` both named the site something the brand owner
 * does not call it, while `SiteLogo` drew a third spelling.
 *
 * `seo/json-ld.ts:408` already records the previous round of this:
 * "Production had NEXT_PUBLIC_SITE_NAME='Letitrip' — the wrong casing". The
 * env var is not the owner; it never was.
 *
 * ── 🛑 The defaults here are NEUTRAL, and that asymmetry is deliberate ─────
 *
 * `baseline-resolver.ts`'s BASELINE is documented as matching letitrip.in
 * ("INR / en-IN / IN / +91 / Asia/Kolkata") and that is defensible: a wrong
 * currency is visible in the first rendered price, so an unconfigured install
 * discovers it immediately.
 *
 * A wrong brand name is not. It renders plausibly, reads as intentional, and
 * is someone else's trademark. So an unconfigured install gets `"Site"` —
 * obviously unconfigured — never this marketplace's name.
 *
 * ── 🛑 TWO injection points, because this one is isomorphic ────────────────
 *
 * `supplier-of-record` is server-only (invoices). Brand is rendered by client
 * components — the guide views are `"use client"` prose — so module state set
 * in `providers.config.ts` (server, via the instrumentation hook) is not
 * visible in the browser bundle. The consumer therefore calls
 * `configureBrand()` in BOTH `providers.config.ts` and
 * `client-providers-init.ts`, which is the same symmetry `setStorageNamespace`
 * already uses, reading from the one owner in each case.
 *
 * @tag domain:core
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:module-state
 */

export interface BrandIdentity {
  /** Display name, e.g. "LetItRip". Appears in prose, email and structured data. */
  name: string;
  /** Compact form for tight chrome, e.g. "LT". Defaults to `name`. */
  shortName: string;
  /**
   * Bare host with no scheme, e.g. "letitrip.in". Used for the media watermark
   * default and for addresses quoted in prose.
   */
  domain: string;
  /** Where buyers and sellers are told to write. Derived from `domain` when unset. */
  supportEmail: string;
  /** Envelope sender for transactional mail. Derived from `domain` when unset. */
  noreplyEmail: string;
}

/**
 * 🛑 "Site" and "example.invalid", not this marketplace's values.
 *
 * `.invalid` is reserved by RFC 2606 precisely so it can never resolve, which
 * makes an unconfigured install fail visibly at the first send rather than
 * quietly mailing a real domain someone else owns.
 */
const NEUTRAL: Readonly<BrandIdentity> = Object.freeze({
  name: "Site",
  shortName: "Site",
  domain: "example.invalid",
  supportEmail: "support@example.invalid",
  noreplyEmail: "noreply@example.invalid",
});

let _brand: Partial<BrandIdentity> = {};

/**
 * Register the consumer's brand. Call once, at boot, on BOTH sides.
 *
 * Merges rather than replaces, so a partial call cannot blank a field that was
 * already supplied — the same shape `configureMarketDefaults` and
 * `configurePlatformSupplier` use.
 */
export function configureBrand(brand: Partial<BrandIdentity>): void {
  _brand = { ..._brand, ...brand };
}

/** Reset to the neutral defaults. For tests and the seed CLI's isolated runs. */
export function resetBrand(): void {
  _brand = {};
}

/** Display name. `"Site"` when nothing was injected. */
export function getBrandName(): string {
  return _brand.name?.trim() || NEUTRAL.name;
}

/** Compact name, falling back to the display name rather than to `"Site"`. */
export function getBrandShortName(): string {
  return _brand.shortName?.trim() || getBrandName();
}

/** Bare host, no scheme. */
export function getBrandDomain(): string {
  return _brand.domain?.trim() || NEUTRAL.domain;
}

/**
 * Support address, derived from `domain` when not injected explicitly.
 *
 * Derived rather than required because a consumer who has given us a domain
 * has already answered this; making it mandatory would mean two config fields
 * that can disagree (Root Cause #42) for no gain.
 */
export function getBrandSupportEmail(): string {
  if (_brand.supportEmail?.trim()) return _brand.supportEmail.trim();
  const domain = _brand.domain?.trim();
  return domain ? `support@${domain}` : NEUTRAL.supportEmail;
}

/** Transactional envelope sender, derived from `domain` when not injected. */
export function getBrandNoreplyEmail(): string {
  if (_brand.noreplyEmail?.trim()) return _brand.noreplyEmail.trim();
  const domain = _brand.domain?.trim();
  return domain ? `noreply@${domain}` : NEUTRAL.noreplyEmail;
}

/** Full resolved identity (neutral defaults + injected overrides + derivations). */
export function getBrand(): Readonly<BrandIdentity> {
  return Object.freeze({
    name: getBrandName(),
    shortName: getBrandShortName(),
    domain: getBrandDomain(),
    supportEmail: getBrandSupportEmail(),
    noreplyEmail: getBrandNoreplyEmail(),
  });
}
