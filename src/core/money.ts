/**
 * Rupee/paise conversion helpers — gateway-agnostic.
 *
 * Every online payment gateway this project has integrated (Razorpay,
 * PhonePe) bills in paise (India's smallest currency unit), so these live
 * outside any specific provider directory.
 */

/** Convert rupees (float) → paise (integer) for a gateway's amount field. */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Convert paise (integer) → rupees (float). */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}
