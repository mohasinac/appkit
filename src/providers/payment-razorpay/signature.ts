/**
 * Razorpay signature verification — pure `node:crypto`, NO SDK import.
 *
 * 🛑 This is a separate module from `./index.ts` on purpose, and the split is
 * load-bearing rather than tidiness. `_internal/server/features/checkout/
 * actions.ts` needs `verifyPaymentSignature` on the buyer-present verify path,
 * and importing it from the provider's `index.ts` would pull a static
 * `import Razorpay from "razorpay"` into the checkout action's import graph —
 * the whole SDK, its transitive deps and its own `node:` requires — for one
 * HMAC comparison. Root Cause #24 is the same shape one layer down: a static
 * top-level import is resolved before anything is tree-shaken, so "the symbol
 * I use is cheap" does not make the module it lives in cheap.
 *
 * Keep this file free of SDK imports. `./index.ts` re-exports from here so
 * the provider still has one public surface.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { normalizeError } from "../../errors/normalize";

/** The three fields Razorpay's `checkout.js` hands back on a successful payment. */
export interface RazorpayPaymentResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Compares two hex digests without leaking position through an early exit.
 *
 * `timingSafeEqual` throws on unequal buffer lengths, and a non-hex input
 * silently produces a short buffer — both are "not equal", so both are
 * caught rather than propagated. Returning false on malformed input is the
 * fail-closed direction.
 */
export function hexEqual(expected: string, received: string): boolean {
  if (expected.length !== received.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
  } catch (err) {
    void normalizeError(err);
    return false;
  }
}

/**
 * Verifies the signature Razorpay's modal returns to the browser:
 * HMAC-SHA256 over `{order_id}|{payment_id}`, keyed with the SECRET.
 *
 * 🛑 This proves the browser's callback was not forged or tampered with. It is
 * NOT on its own proof that money moved — the digest is computable the moment
 * an order id and a payment id exist, and both are visible to the client.
 * `verifyAndPlaceGatewayOrderAction` therefore checks this AND re-fetches the
 * order from Razorpay; this is the cheap guard, the fetch is the authority.
 * Each alone has a failure mode: signature-only trusts a client-reported
 * outcome, fetch-only accepts a replayed order id from another session.
 */
export function verifyPaymentSignature(
  params: RazorpayPaymentResult,
  keySecret: string,
): boolean {
  if (!keySecret) return false;
  const expected = createHmac("sha256", keySecret)
    .update(`${params.razorpay_order_id}|${params.razorpay_payment_id}`)
    .digest("hex");
  return hexEqual(expected, params.razorpay_signature);
}

/**
 * Verifies a Razorpay webhook: HMAC-SHA256 hex over the RAW request body,
 * compared against the `x-razorpay-signature` header.
 *
 * 🛑 The caller must pass the raw body STRING, not a re-serialised object.
 * `JSON.stringify(JSON.parse(body))` is not guaranteed to reproduce the bytes
 * that were signed — key order and whitespace both survive into the digest.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string,
): boolean {
  if (!webhookSecret) return false;
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return hexEqual(expected, signature);
}
