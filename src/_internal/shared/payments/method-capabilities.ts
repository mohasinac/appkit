/**
 * What a payment method DOES, so code can stop asking what it is CALLED.
 *
 * ── Why ───────────────────────────────────────────────────────────────────
 *
 * `method-resolution.ts` already made the slug open — *"a closed `z.enum`
 * here is the defect, not the safeguard"* — but roughly nineteen places still
 * branch on the literal, so adding a method is still a deploy.
 *
 * 🛑 THE CODE ALREADY KNOWS THIS. `checkout/actions.ts` reads
 * `const isCodLike = paymentMethod === "cod"` — it NAMES the property in the
 * variable while testing the identity one line later. And
 * `cancellation-refund.ts` branches on `=== "cod"` to print *"collected by
 * the courier, with no gateway transaction to reverse"*, which is a
 * capability written out in prose.
 *
 * So none of those branches are really about COD. They are about three
 * properties, and this names them.
 *
 * ── The governing rule ────────────────────────────────────────────────────
 *
 * *"A mechanism never asks what type is this — it asks does this thing have
 * the capability."* Same move the listing-type registry already made, applied
 * to money. CLAUDE.md's own 2026-11-11 note says it best, about retargeting a
 * deleted `isManualPaymentMethod` onto `cod`: **translate the PROPERTY, do
 * not just silence the error.** Had these properties existed then, that
 * retarget would have been a lookup rather than a judgement call.
 */

/**
 * The three properties the branch sites actually test.
 *
 * ⚠ Deliberately NOT "is it COD / is it online". Those are identities, and an
 * identity cannot answer a question about a method nobody has added yet.
 */
export interface PaymentMethodCapabilities {
  /**
   * Money arrives at DELIVERY, not at checkout.
   *
   * Drives the deposit/remainder split, the COD handling fee, and whether an
   * order can be placed with nothing captured.
   */
  collectsOnDelivery: boolean;
  /**
   * A gateway captured money that can be reversed programmatically.
   *
   * 🛑 The refund path's real question. `false` means a refund has to become a
   * human-settled owed case, because there is no transaction to call.
   */
  hasReversibleCapture: boolean;
  /**
   * No money moves at checkout at all — a staff override, not a tender.
   *
   * ⚠ Distinct from `collectsOnDelivery`: COD still collects, later. This one
   * never collects, so it must never produce a payable or a refundable.
   */
  bypassesCapture: boolean;
}

/**
 * What this build knows.
 *
 * 🛑 A `Record<string, …>`, NOT a `Record<PaymentMethodSlug, …>` closed map —
 * the whole point is that a slug can arrive that is not listed here. Adding a
 * method is a config row plus (optionally) an entry here if it behaves
 * differently from the default.
 */
export const PAYMENT_METHOD_CAPABILITIES: Readonly<Record<string, PaymentMethodCapabilities>> = {
  cod: { collectsOnDelivery: true, hasReversibleCapture: false, bypassesCapture: false },
  online: { collectsOnDelivery: false, hasReversibleCapture: true, bypassesCapture: false },
  razorpay: { collectsOnDelivery: false, hasReversibleCapture: true, bypassesCapture: false },
  phonepe: { collectsOnDelivery: false, hasReversibleCapture: true, bypassesCapture: false },
  cashfree: { collectsOnDelivery: false, hasReversibleCapture: true, bypassesCapture: false },
  upi: { collectsOnDelivery: false, hasReversibleCapture: true, bypassesCapture: false },
  admin_bypass: { collectsOnDelivery: false, hasReversibleCapture: false, bypassesCapture: true },
};

/**
 * What an UNKNOWN method is assumed to do.
 *
 * ────────────────────────────────────────────────────────────────────────
 * 🛑 EVERY FIELD HERE IS CHOSEN FOR WHAT IT COSTS WHEN WE ARE WRONG.
 * ────────────────────────────────────────────────────────────────────────
 *
 * · `hasReversibleCapture: false` — assuming `true` would fire a gateway
 *   refund against a method that has no gateway, which fails somewhere deep
 *   and leaves the buyer unrefunded while the system believes it paid them.
 *   `false` opens a human-settled owed case: slower, visible, recoverable.
 *
 * · `collectsOnDelivery: false` — assuming `true` would let an order be
 *   placed with NOTHING captured, on a method we cannot describe. The money
 *   path must not open itself to an unknown.
 *
 * · `bypassesCapture: false` — assuming `true` would skip collection
 *   entirely. That is the staff-override power, and an unrecognised slug must
 *   never inherit it.
 *
 * ⚠ So an unknown method degrades to "treat it like something that took money
 * we cannot programmatically return". That is the conservative corner in all
 * three axes, and it is deliberately NOT the same as refusing the method —
 * refusal is `resolvePaymentMethod`'s job, and a method can be perfectly
 * allowed while this build cannot describe its mechanics.
 */
export const UNKNOWN_METHOD_CAPABILITIES: PaymentMethodCapabilities = {
  collectsOnDelivery: false,
  hasReversibleCapture: false,
  bypassesCapture: false,
};

/** What this method does, falling back to the conservative unknown profile. */
export function capabilitiesFor(method: string | undefined | null): PaymentMethodCapabilities {
  if (typeof method !== "string") return UNKNOWN_METHOD_CAPABILITIES;
  return PAYMENT_METHOD_CAPABILITIES[method.trim()] ?? UNKNOWN_METHOD_CAPABILITIES;
}

/** Money arrives at delivery — the question `isCodLike` was really asking. */
export function collectsOnDelivery(method: string | undefined | null): boolean {
  return capabilitiesFor(method).collectsOnDelivery;
}

/**
 * Can a refund be issued programmatically, or must a human settle it?
 *
 * ⚠ The refund path's actual question. `false` is not an error — it routes to
 * an owed case, which is a real and correct outcome for COD.
 */
export function hasReversibleCapture(method: string | undefined | null): boolean {
  return capabilitiesFor(method).hasReversibleCapture;
}

/** A staff override where no money moves at all. */
export function bypassesCapture(method: string | undefined | null): boolean {
  return capabilitiesFor(method).bypassesCapture;
}

/** Does this build know how this method behaves, or is it using the fallback? */
export function isKnownPaymentMethod(method: string | undefined | null): boolean {
  return typeof method === "string" && PAYMENT_METHOD_CAPABILITIES[method.trim()] !== undefined;
}
