/**
 * Which payment methods apply — resolved across platform, store, listing and
 * buyer.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Owner, 2026-11-10: *"the payments and all now becomes a config change rather
 * than code changes — like how the main website goal is."*
 *
 * Today `paymentMethod` is a free-form `string` that **19 places branch on** —
 * the worst of both worlds: no validation AND hardcoded behaviour. Enabling a
 * method for one store, or adding a method at all, is a deploy.
 *
 * This module is the machinery; the choice lives in config. Adding a method
 * the code has never heard of must be a row, not a release.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 🛑 THE PRECEDENCE, AND THE TRAP INSIDE IT
 * ────────────────────────────────────────────────────────────────────────────
 *
 *   platform.disabled || buyerDenied ? OFF : (listing ?? store ?? platform.default)
 *
 * The platform contributes **two different things**: a hard `disabled` CEILING
 * and a soft `default` FLOOR. Collapsing those into one value is precisely
 * what makes a kill-switch overridable — a store setting `true` would defeat
 * an admin who turned the method off for the whole site.
 *
 * ⚠ Store and listing are the SAME priority. A listing wins over its store
 * only because it is more specific, which is how a seller creates something
 * that is not their usual. Neither may exceed the platform.
 *
 * 🛑 The buyer level is DENY-ONLY. A restricted buyer must never *gain* a
 * method at any level, so it sits beside the platform ceiling rather than in
 * the `??` chain. Modelling it as "the buyer's value wins" inverts that the
 * first time someone stores a buyer-level `true`.
 */

/**
 * An open slug — `"cod"`, `"upi"`, `"razorpay"`, or something this build has
 * never heard of.
 *
 * 🛑 Deliberately `string`, not a union. A closed `z.enum` here is the defect,
 * not the safeguard: it makes every new method a deploy, which is the thing
 * this module exists to prevent. Validation belongs at the edge (is it a sane
 * slug?), not in the type.
 */
export type PaymentMethodSlug = string;

/** One level's opinion. `undefined` means "no opinion — ask the next level". */
export type MethodOpinion = boolean | undefined;

export interface MethodResolutionInput {
  /** 🛑 Hard ceiling. True here beats every other level. */
  readonly platformDisabled: boolean;
  /** Soft floor, used when nobody more specific has an opinion. */
  readonly platformDefault: boolean;
  readonly storeValue?: MethodOpinion;
  readonly listingValue?: MethodOpinion;
  /** 🛑 Deny-only. True removes the method for this buyer, whatever else says. */
  readonly buyerDenied?: boolean;
}

export type MethodDecision =
  | { allowed: true }
  | { allowed: false; reason: "platform_disabled" | "buyer_denied" | "not_enabled" };

/**
 * Resolve one method for one context.
 *
 * Returns a REASON rather than a bare boolean, because the three ways a method
 * can be unavailable need different handling and different copy: a buyer told
 * "unavailable" when they are personally restricted will contact support, and
 * support needs to be able to see which it was.
 */
export function resolvePaymentMethod(input: MethodResolutionInput): MethodDecision {
  // Ceiling first. Checked before anything else can say yes.
  if (input.platformDisabled) return { allowed: false, reason: "platform_disabled" };
  if (input.buyerDenied === true) return { allowed: false, reason: "buyer_denied" };

  /*
   * `??` and not `||`: a level that has explicitly set FALSE must win over
   * the level beneath it. With `||`, an explicit `false` would fall through
   * and be overruled by the platform default — silently re-enabling exactly
   * what a seller had turned off.
   */
  const enabled = input.listingValue ?? input.storeValue ?? input.platformDefault;
  return enabled ? { allowed: true } : { allowed: false, reason: "not_enabled" };
}

/**
 * Resolve every configured method for one context, preserving config order.
 *
 * ⚠ Methods with no registered PROVIDER are still returned as decisions —
 * filtering them here would conflate "the operator turned this off" with "no
 * code can serve it", and the caller needs to tell a buyer the first and an
 * admin the second.
 */
export function resolveAvailableMethods(
  methods: readonly PaymentMethodSlug[],
  lookup: (method: PaymentMethodSlug) => MethodResolutionInput,
): Array<{ method: PaymentMethodSlug; decision: MethodDecision }> {
  return methods.map((method) => ({ method, decision: resolvePaymentMethod(lookup(method)) }));
}

/**
 * The slug format accepted at the edge.
 *
 * Lowercase, digits, underscore. 🛑 Validation, not enumeration — it rejects
 * nonsense without pretending to know the permitted set, which is the whole
 * point of an open slug. Same shape event `type` took on 2026-11-08.
 */
const SLUG = /^[a-z][a-z0-9_]{1,39}$/;

export function isValidPaymentMethodSlug(value: unknown): value is PaymentMethodSlug {
  return typeof value === "string" && SLUG.test(value);
}
