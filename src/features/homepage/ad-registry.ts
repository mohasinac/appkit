/**
 * Ad Placement Registry
 *
 * Provides a typed, centralized registry of ad slot configurations.
 * Consumers call `registerAdSlot` at app boot to configure each slot,
 * then render `<AdSlot id="..." />` in page layouts.
 *
 * Consent gate: slots with `requiresConsent: true` will not render until
 * `setAdConsentGranted(true)` is called (e.g. after cookie banner accept).
 *
 * @example
 * // In your layout root:
 * registerAdSlots([
 *   { id: "homepage-hero-banner", provider: "adsense", adsenseClient: "ca-pub-...", adsenseSlot: "..." },
 *   { id: "listing-between-rows", provider: "manual", reservedHeight: 90 },
 * ]);
 */

// ---------------------------------------------------------------------------
// Slot ID catalog
// ---------------------------------------------------------------------------

export type AdSlotId =
  | "homepage-hero-banner"
  | "homepage-mid-banner"
  | "homepage-bottom-banner"
  | "listing-sidebar-top"
  | "listing-sidebar-bottom"
  | "listing-between-rows"
  | "detail-below-gallery"
  | "detail-below-price"
  | "cart-upsell"
  | "checkout-upsell"
  | "search-inline";

// ---------------------------------------------------------------------------
// Provider types
// ---------------------------------------------------------------------------

/**
 * `manual`     — static HTML/React content supplied via `manualContent` on `<AdSlot>`
 * `adsense`    — Google AdSense `<ins>` tag; requires `adsenseClient` + `adsenseSlot`
 * `thirdParty` — third-party iframe; requires `thirdPartyUrl` or `thirdPartyScript`
 */
export type AdProvider = "manual" | "adsense" | "thirdParty";

// ---------------------------------------------------------------------------
// Slot configuration
// ---------------------------------------------------------------------------

export interface AdSlotConfig {
  /** Unique slot identifier. */
  id: AdSlotId;

  /** Primary ad provider for this slot. */
  provider: AdProvider;

  /**
   * Reserved pixel height for the slot container.
   * Prevents layout shift (CLS) while the ad loads.
   * @default undefined (no reserved height)
   */
  reservedHeight?: number;

  /**
   * Fallback provider order if the primary provider fails or is disabled.
   * Tried left-to-right until one succeeds.
   */
  fallbackOrder?: AdProvider[];

  /**
   * When `true` the slot will not render until `setAdConsentGranted(true)` has
   * been called. Use for GDPR/consent-gated slots.
   * @default false
   */
  requiresConsent?: boolean;

  /**
   * Master on/off switch. `false` → slot renders nothing (no reserved space).
   * @default true
   */
  enabled?: boolean;

  // -- adsense provider options --

  /** AdSense publisher ID, e.g. "ca-pub-1234567890" */
  adsenseClient?: string;
  /** AdSense ad-slot string, e.g. "9876543210" */
  adsenseSlot?: string;
  /** AdSense data-ad-format (default: "auto") */
  adsenseFormat?: string;

  // -- thirdParty provider options --

  /** Full URL for an iframe `src`. */
  thirdPartyUrl?: string;
  /** Raw `<script>` tag inner text to inject (server-safe strings only). */
  thirdPartyScript?: string;
  /** iframe width, e.g. "728px". */
  thirdPartyWidth?: string;
  /** iframe height, e.g. "90px". */
  thirdPartyHeight?: string;
}

// ---------------------------------------------------------------------------
// Registry store
// ---------------------------------------------------------------------------

const _registry = new Map<AdSlotId, AdSlotConfig>();
let _consentGranted = false;

/**
 * Register (or replace) an ad slot configuration.
 * Call once at app boot — e.g. in a layout component or `providers.tsx`.
 */
export function registerAdSlot(config: AdSlotConfig): void {
  _registry.set(config.id, {
    enabled: true,
    requiresConsent: false,
    ...config,
  });
}

/** Register multiple ad slots at once. */
export function registerAdSlots(configs: AdSlotConfig[]): void {
  configs.forEach(registerAdSlot);
}

/** Retrieve the config for a given slot id. Returns `undefined` if unregistered. */
export function getAdSlot(id: AdSlotId): AdSlotConfig | undefined {
  return _registry.get(id);
}

/** Return all registered slot configs. */
export function getAllAdSlots(): AdSlotConfig[] {
  return Array.from(_registry.values());
}

/** Remove a slot config from the registry. */
export function unregisterAdSlot(id: AdSlotId): void {
  _registry.delete(id);
}

/** Clear all registered slot configs (useful in tests / HMR). */
export function clearAdRegistry(): void {
  _registry.clear();
}

// ---------------------------------------------------------------------------
// Consent gate
// ---------------------------------------------------------------------------

/**
 * Signal that the user has granted consent for personalised / tracking ads.
 * Consent-gated slots (`requiresConsent: true`) will start rendering.
 *
 * @example
 * onAcceptAll={() => setAdConsentGranted(true)}
 */
export function setAdConsentGranted(granted: boolean): void {
  _consentGranted = granted;
}

/** Returns the current consent state. */
export function isAdConsentGranted(): boolean {
  return _consentGranted;
}

/**
 * Returns `true` if the slot should render given the current registry +
 * consent state.
 */
export function isAdSlotRenderable(id: AdSlotId): boolean {
  const config = _registry.get(id);
  if (!config) return false;
  if (config.enabled === false) return false;
  if (config.requiresConsent && !_consentGranted) return false;
  return true;
}
