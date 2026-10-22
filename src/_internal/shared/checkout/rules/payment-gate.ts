/*
 * WHY: Some listings must not be bought with a pay-later method. An auction win
 *      or a bundle is a committed sale — a buyer who never pays on delivery
 *      costs the seller the lot, and for a unique auction lot there is no
 *      second-highest bidder to fall back on once it is marked sold. The rule
 *      registry has a field for this (`blockedPaymentMethods`) and nothing
 *      reachable enforced it for every line.
 * WHAT: One cart-wide payment check, run BEFORE the transaction.
 *
 * 🛑 `runSyncPreflight` STRUCTURALLY CANNOT DO THIS, and that is not a bug in
 * preflight. It does `if (isMultiMemberLine(pair.item)) continue;` for a good
 * reason: a bundle or grouped line's own `listingType` describes the WRAPPER,
 * not its members, so a per-type rule applied there would be applied to the
 * wrong thing. Both of its call sites repeat the skip independently, and the
 * online path additionally reduces each line to `getCartItemMemberIds(item)[0]`
 * — its FIRST member only. So a `blockedPaymentMethods` set on `bundleRule` and
 * left to preflight would be a silent no-op: the field would be set, reviewed,
 * and never read.
 *
 * This resolves every line to ALL its members, so a grouped line containing one
 * blocked listing is caught.
 *
 * 🛑 IT RUNS OUTSIDE THE TRANSACTION. Preflight is invoked inside the
 * transaction callback, so a payment-method rejection there spends a full
 * transaction attempt to produce an answer that depends on nothing the
 * transaction reads.
 *
 * EXPORTS: assertPaymentMethodAllowed, blockedMethodsForCart
 *
 * @tag domain:checkout
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:server/features/checkout
 * @tag sideEffects:none
 */

import { ValidationError } from "../../../../errors/index";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import type { ListingType } from "../../../../features/products/types/index";
import {
  CHECKOUT_PAYMENT_METHODS,
  type CheckoutPaymentMethod,
} from "../../features/checkout/config";
import { getCartItemMemberIds } from "../line-members";
import { getCategoryRule, getListingRule } from "./_registry";

/** Why one method is unavailable, and which listing said so. */
export interface BlockedMethod {
  /** The listing's own wording when it has one, else a generated sentence. */
  message: string;
  /** For logs and for the generated wording. */
  label: string;
}

/**
 * Which methods this cart forbids.
 *
 * Returned rather than thrown so the same answer can also DISABLE a payment
 * control — one source for the refusal and the affordance, instead of a
 * client-side guess that drifts from the server.
 */
export function blockedMethodsForCart(
  items: readonly CartItemDocument[],
  productById: ReadonlyMap<string, ProductDocument>,
): Map<CheckoutPaymentMethod, BlockedMethod> {
  const blocked = new Map<CheckoutPaymentMethod, BlockedMethod>();

  const claim = (
    methods: readonly CheckoutPaymentMethod[] | undefined,
    label: string,
    message: string | undefined,
  ): void => {
    for (const m of methods ?? []) {
      // First claimant wins, so the message names a real listing rather than
      // whichever happened to be last in the cart.
      if (blocked.has(m)) continue;
      blocked.set(m, {
        label,
        message:
          message ??
          `"${label}" cannot be paid for with ${PAYMENT_METHOD_LABEL[m] ?? m}.`,
      });
    }
  };

  for (const item of items) {
    /*
     * A bundle's restriction lives on its CategoryCheckoutRule, not on any
     * listing type — its members are ordinary products whose own types would
     * otherwise answer for it. Checked first for that reason.
     */
    if (item.bundleCategorySlug) {
      const rule = getCategoryRule("bundle");
      claim(
        rule?.blockedPaymentMethods,
        item.groupTitle ?? item.productTitle ?? "this bundle",
        rule?.blockedPaymentMessage,
      );
    }

    /*
     * EVERY member, not the first. `getCartItemMemberIds` returns the line's
     * own product for a plain line and all members for a bundle or group, so
     * one blocked member blocks the line.
     */
    for (const productId of getCartItemMemberIds(item)) {
      const product = productById.get(productId);
      /*
       * An unresolved member is NOT treated as unrestricted here. It is left to
       * the stock and existence checks that already run on the same cart and
       * fail loudly — inventing a payment refusal for a missing product would
       * report the wrong problem.
       */
      if (!product) continue;
      const type = (product.listingType ?? "standard") as ListingType;
      const rule = getListingRule(type);
      claim(rule.blockedPaymentMethods, product.title ?? type, rule.blockedPaymentMessage);
    }
  }

  return blocked;
}

/** Human wording for the generated message. */
const PAYMENT_METHOD_LABEL: Partial<Record<CheckoutPaymentMethod, string>> = {
  cod: "cash on delivery",
  cash: "cash on pickup",
  emi: "EMI",
  online: "online payment",
  upi_manual: "manual bank/UPI transfer",
};

/**
 * Throw when the chosen method is forbidden by anything in the cart.
 *
 * One error, not one per offending line: a buyer changes the payment method
 * once, and listing every blocked item would be a wall of text about a single
 * decision.
 */
export function assertPaymentMethodAllowed(
  items: readonly CartItemDocument[],
  productById: ReadonlyMap<string, ProductDocument>,
  paymentMethod: CheckoutPaymentMethod | undefined,
): void {
  if (!paymentMethod) return;

  /*
   * 🛑 `admin_bypass` is exempt, deliberately. It exists so an admin can reach
   * an order state without a real payment, is gated by a site-settings flag
   * plus an admin role, and logs every use. Blocking it would make the one tool
   * for testing these flows unable to test them.
   */
  if (paymentMethod === "admin_bypass") return;

  const blocked = blockedMethodsForCart(items, productById);
  const offender = blocked.get(paymentMethod);
  if (!offender) return;

  /*
   * The methods that remain, derived from the union rather than a second list —
   * a seventh payment method must not quietly go unmentioned here.
   */
  const allowed = CHECKOUT_PAYMENT_METHODS.filter(
    (m) => m !== "admin_bypass" && !blocked.has(m),
  ).map((m) => PAYMENT_METHOD_LABEL[m] ?? m);

  throw Object.assign(
    new ValidationError(
      allowed.length > 0
        ? `${offender.message} Available instead: ${allowed.join(", ")}.`
        : `${offender.message} Nothing in this cart's combination can be paid for — remove the item and buy it on its own.`,
    ),
    { code: "PAYMENT_METHOD_BLOCKED" },
  );
}

/**
 * Throw when anything in the cart forbids an instalment plan.
 *
 * 🛑 Reads the SAME `blockedPaymentMethods` declaration, under the key
 * `"emi"`, rather than introducing a parallel `blocksEmi` field. The listing
 * rules already say "this listing type cannot be paid in instalments" — they
 * said it by naming a payment method, because that is what EMI was. Once EMI
 * became an order-level opt-in, that declaration needed a second reader, not
 * a second declaration: a rule stated twice is a rule that drifts (Root Cause
 * #61), and `prizeDrawRule`'s entry would otherwise have gone inert the day
 * the tender disappeared.
 *
 * `blockedPaymentMessage` is reused verbatim for the same reason the gate
 * above prefers it to a generated sentence: it names the REASON (winner
 * assignment waits on confirmed payment), which is what lets a buyer choose
 * differently instead of abandoning.
 */
export function assertEmiOptInAllowed(
  items: readonly CartItemDocument[],
  productById: ReadonlyMap<string, ProductDocument>,
  emiOptIn: boolean,
): void {
  if (!emiOptIn) return;
  const offender = blockedMethodsForCart(items, productById).get("emi");
  if (!offender) return;
  throw Object.assign(
    new ValidationError(
      `${offender.message} Pay for this order in full instead, or remove the item and buy it on its own.`,
    ),
    { code: "EMI_NOT_ALLOWED" },
  );
}
