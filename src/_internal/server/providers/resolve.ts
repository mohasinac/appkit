/**
 * `resolvePaymentProvider` / `resolveShippingProvider` — decide between the
 * real adapter and the in-process mock based on site-settings feature flags.
 *
 * Resolution rule (single explicit boolean per provider, no implicit fallback):
 *
 *   1. Read `siteSettings.featureFlags.useMockPayment` /
 *      `featureFlags.useMockShipping`.
 *   2. If the flag is `true` and `process.env.NODE_ENV !== "production"` →
 *      return the mock provider.
 *   3. If the flag is `true` and `process.env.NODE_ENV === "production"` →
 *      THROW. Production must never run with a mock flag set. Loud failure
 *      is the contract.
 *   4. Otherwise → return the real provider supplied by the caller.
 *
 * The resolver is intentionally provider-agnostic (it accepts factories so
 * the consumer's `providers.config.ts` controls instantiation), keeping this
 * file zero-dep on Razorpay / Shiprocket SDK chains.
 */

import type { IPaymentProvider, IShippingProvider } from "../../../contracts";

export interface ProviderResolutionContext {
  readonly nodeEnv: string;
  readonly siteSettings: {
    readonly featureFlags?: {
      readonly useMockPayment?: boolean;
      readonly useMockShipping?: boolean;
    };
  };
}

export interface PaymentResolutionFactories {
  readonly real: () => Promise<IPaymentProvider> | IPaymentProvider;
  readonly mock: () => Promise<IPaymentProvider> | IPaymentProvider;
}

export interface ShippingResolutionFactories {
  readonly real: () => Promise<IShippingProvider> | IShippingProvider;
  readonly mock: () => Promise<IShippingProvider> | IShippingProvider;
}

export async function resolvePaymentProvider(
  ctx: ProviderResolutionContext,
  factories: PaymentResolutionFactories,
): Promise<IPaymentProvider> {
  const want = ctx.siteSettings.featureFlags?.useMockPayment === true;
  if (want && ctx.nodeEnv === "production") {
    throw new Error(
      "[providers] siteSettings.featureFlags.useMockPayment is TRUE in production. " +
        "The mock payment provider must never run in production. Set the flag to false " +
        "in Admin → Site Settings, or unset NODE_ENV=production for the deploy.",
    );
  }
  return want ? await factories.mock() : await factories.real();
}

export async function resolveShippingProvider(
  ctx: ProviderResolutionContext,
  factories: ShippingResolutionFactories,
): Promise<IShippingProvider> {
  const want = ctx.siteSettings.featureFlags?.useMockShipping === true;
  if (want && ctx.nodeEnv === "production") {
    throw new Error(
      "[providers] siteSettings.featureFlags.useMockShipping is TRUE in production. " +
        "The mock shipping provider must never run in production. Set the flag to false " +
        "in Admin → Site Settings, or unset NODE_ENV=production for the deploy.",
    );
  }
  return want ? await factories.mock() : await factories.real();
}
