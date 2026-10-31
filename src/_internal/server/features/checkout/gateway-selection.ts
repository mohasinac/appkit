/*
 * WHY: The gateway that collects a cart is a PER-CART decision and the
 *      provider registry resolves ONE provider per process. Everything
 *      downstream of capture (refunds, reconciliation, webhooks) rightly talks
 *      to whichever gateway is live; only the moment of CAPTURE has to ask
 *      "which gateway may lawfully collect THIS cart".
 * WHAT: The server-side bridge between the provider registry (server-only) and
 *       `_internal/shared/checkout/settlement.ts` (isomorphic, pure). This file
 *       reads the registry; the rule itself lives in the shared module so it is
 *       testable without a registry and cannot drift between the two call
 *       sites.
 *
 * EXPORTS: paymentGatewayCandidates, resolveCollectingGatewayForCart,
 *          assertCollectingGateway
 *
 * @tag domain:checkout,payments
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:server/features/checkout/actions,api/payment/create-order
 * @tag sideEffects:none
 */

import type { IPaymentProvider } from "../../../../contracts/payment";
import { getProviders } from "../../../../contracts/registry";
import { ValidationError } from "../../../../errors/index";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import {
  GATEWAY_UNAVAILABLE_CODE,
  resolveCollectingGateway,
  type GatewayResolution,
  type SettlementGatewayCandidate,
} from "../../../shared/checkout/settlement";

/**
 * Every enabled gateway, as the shared resolver wants to see it, paired with
 * the provider it came from so the winner can actually be used.
 *
 * 🛑 The fallback when `paymentGateways` is unregistered is `supportsSplit:
 * false`, NOT "assume the active gateway splits". An install that has not
 * adopted the per-cart resolver keeps its single-vendor behaviour unchanged and
 * is refused for multi-vendor carts. Assuming the other way round would make
 * an un-migrated install read as compliant while commingling on every
 * multi-vendor payment — and that failure presents as a successful checkout,
 * so nothing would ever surface it.
 */
export function paymentGatewayCandidates(): Array<{
  candidate: SettlementGatewayCandidate;
  provider: IPaymentProvider;
}> {
  const registry = getProviders();
  const registered = registry.paymentGateways;

  if (registered && registered.length > 0) {
    return registered.map((entry) => ({
      provider: entry.provider,
      candidate: {
        name: entry.provider.name,
        supportsSplit: entry.supportsSplit === true,
        accepts: entry.provider.acceptsRestrictedListingTypes,
        order: entry.order,
      },
    }));
  }

  const fallback = registry.payment;
  if (!fallback) return [];
  return [
    {
      provider: fallback,
      candidate: {
        name: fallback.name,
        supportsSplit: false,
        accepts: fallback.acceptsRestrictedListingTypes,
        order: 0,
      },
    },
  ];
}

export interface CollectingGatewayResult {
  resolution: GatewayResolution;
  /** The adapter that must collect. Present only when `resolution.ok`. */
  provider?: IPaymentProvider;
}

/**
 * Which gateway must collect this cart, resolved from the registry.
 *
 * Returns rather than throws, so a caller that wants to DISABLE a control or
 * log a compliance incident can read the same answer the refusal is built
 * from — one source for the refusal and the affordance, which is the rule
 * `blockedMethodsForCart` already follows.
 */
export function resolveCollectingGatewayForCart(input: {
  items: readonly CartItemDocument[];
  productById: ReadonlyMap<string, ProductDocument>;
  /** `siteSettings.payment.platformStoreId`. Unset ⇒ every store is third-party. */
  platformStoreId?: string | null;
}): CollectingGatewayResult {
  const entries = paymentGatewayCandidates();
  const resolution = resolveCollectingGateway({
    candidates: entries.map((e) => e.candidate),
    items: input.items,
    productById: input.productById,
    platformStoreId: input.platformStoreId,
  });

  if (!resolution.ok || !resolution.gateway) return { resolution };

  /*
   * Matched by NAME here only because this is the inverse mapping back to the
   * object the candidate was derived from — not a compliance test. The rule
   * itself never sees a gateway name (see `SettlementGatewayCandidate`'s 🛑).
   */
  const winnerName = resolution.gateway.name;
  const provider = entries.find((e) => e.candidate.name === winnerName)?.provider;
  return { resolution, provider };
}

/**
 * The gateway that must collect this cart, or a refusal.
 *
 * 🛑 MUST be called BEFORE a payment session exists. There is deliberately no
 * fallback to the process-level provider: that fallback is the commingling this
 * whole mechanism exists to prevent, and because the money would be collected
 * successfully it would look exactly like a working checkout.
 *
 * 🛑 Conversely it must NOT be called to refuse anything AFTER capture. By then
 * the funds have already settled wherever the collecting gateway settles, so a
 * throw does not un-commingle anything — it only denies the buyer the order
 * their money has already paid for, which is the money-taken/no-order failure
 * class this codebase has paid for twice. The settle path resolves and RECORDS
 * instead.
 *
 * The thrown error carries `code: GATEWAY_UNAVAILABLE_FOR_CART` and
 * `constraint`, which is which of the two independent reasons bound —
 * `vendor-composition` (another seller's goods, capture must split) or
 * `listing-type` (the category's own gateway permission). A buyer or an admin
 * told the wrong reason fixes the wrong thing.
 */
export function assertCollectingGateway(input: {
  items: readonly CartItemDocument[];
  productById: ReadonlyMap<string, ProductDocument>;
  platformStoreId?: string | null;
}): { provider: IPaymentProvider; resolution: GatewayResolution } {
  const { resolution, provider } = resolveCollectingGatewayForCart(input);
  if (resolution.ok && provider) return { provider, resolution };

  throw Object.assign(
    new ValidationError(
      resolution.reason ?? "Online payment is not available for this cart.",
    ),
    {
      code: GATEWAY_UNAVAILABLE_CODE,
      constraint: resolution.failedConstraint,
      detail: resolution.detail,
    },
  );
}
