/**
 * Bundle discount math — single source of truth for turning
 * `bundlePrice` + `bundleOriginalTotal` (sum of member products' individual
 * prices, denormalised onto the bundle doc at write time — see
 * `resolveBundleOriginalTotal` in `_internal/server/features/bundles/data.ts`)
 * into a displayable "X% OFF" figure.
 *
 * Pure — no React, no Firestore. Safe to import from any bundle view.
 */

export interface BundleDiscount {
  /** Sum of member products' individual prices (decimal rupees). */
  originalTotal: number;
  /** originalTotal - bundlePrice (decimal rupees). */
  savings: number;
  /** Rounded whole-number percentage off, e.g. 25 for "25% OFF". */
  percent: number;
}

/**
 * Returns null when there's nothing genuine to show — either total is
 * missing/zero, or the bundle price isn't actually cheaper than buying the
 * parts separately (a mispriced bundle is not "a discount").
 */
export function computeBundleDiscount(
  bundlePrice?: number,
  bundleOriginalTotal?: number,
): BundleDiscount | null {
  if (!bundlePrice || !bundleOriginalTotal) return null;
  if (bundleOriginalTotal <= bundlePrice) return null;
  const savings = bundleOriginalTotal - bundlePrice;
  const percent = Math.round((savings / bundleOriginalTotal) * 100);
  if (percent <= 0) return null;
  return { originalTotal: bundleOriginalTotal, savings, percent };
}
