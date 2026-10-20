/**
 * The platform's own supplier-of-record identity, injected once at boot.
 *
 * ── Why this seam exists ──────────────────────────────────────────────────
 *
 * `appkit.config.js → business` is documented as "THE one owner of the
 * business's statutory identity", and it records what it was created to end:
 * the legal name, address, GSTIN and support channels had lived in five places
 * that already disagreed — four different support addresses published, the
 * registered address saying Solapur while the warehouse said Hyderabad.
 *
 * But that file belongs to the CONSUMER, and appkit has no runtime reader for
 * it. `resolveSupplierIdentity` therefore read `siteSettings.gst.*` instead,
 * which quietly made the invoice path a SIXTH owner — and the one that decides
 * what a tax invoice says about who issued it.
 *
 * So the consumer injects it at boot, the same way `configureMarketDefaults`
 * injects currency and locale: one call in `providers.config.ts`, values read
 * from `src/constants/business.ts`, which reads `appkit.config.js`. One owner,
 * one hop.
 *
 * 🛑 This is NOT a cache of site settings and must not become one. Whether to
 * charge GST at all stays `siteSettings.gst.enabled` — an operational switch an
 * admin owns. WHO the supplier is is a fact about the registered entity, is
 * legally required to be published, and belongs in a committed file.
 *
 * @tag domain:site-settings
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:module-state
 */

export interface PlatformSupplierIdentity {
  gstin?: string;
  legalName?: string;
  /** One line, as it should appear in an invoice header. */
  address?: string;
}

let _identity: PlatformSupplierIdentity = {};

/**
 * Register the platform's statutory identity. Call once, at boot.
 *
 * Merges rather than replaces, so a partial call cannot blank a field that was
 * already supplied — the same shape `configureMarketDefaults` uses.
 */
export function configurePlatformSupplier(
  identity: PlatformSupplierIdentity,
): void {
  _identity = { ..._identity, ...identity };
}

/**
 * The registered identity, or an empty object when nothing was injected.
 *
 * 🛑 Returns `{}` rather than throwing, and the caller must treat a missing
 * GSTIN as "not a tax invoice" — which `resolveSupplierIdentity` already does
 * via `source: "none"`. Throwing here would turn a misconfigured deployment
 * into a failed CHECKOUT, and an order that cannot be placed is worse than an
 * invoice that correctly declines to call itself a tax invoice.
 */
export function getPlatformSupplier(): PlatformSupplierIdentity {
  return _identity;
}

/** Reset — for tests and for the seed CLI's isolated runs. */
export function resetPlatformSupplier(): void {
  _identity = {};
}
