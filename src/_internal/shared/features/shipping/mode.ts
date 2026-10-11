/**
 * How a store prices shipping — C5b.
 *
 * ## What this replaces
 *
 * `resolveShippingCost(storeId)` returned ONE flat rupee number per store:
 * `shippingConfig.customShippingPrice ?? 0`, read off the store OWNER's user
 * document, with no weight, destination, pincode or courier anywhere in it.
 *
 * ## 🛑 And there was a second, richer config that no money path read
 *
 * `ShippingConfigDocument` (collection `shippingConfigs`) has `method`
 * (free/flat/weight/express/pickup/custom), `flatRate`, `pricePerKg`,
 * `freeAbove`, `expressSurcharge`, `estimatedDays` and `zones` — with full
 * CRUD routes, a form schema and seed data. **`shippingConfigsRepository` is
 * called from no money path at all.** So there were two shipping-config
 * systems and the authoritative one was the flat number, by accident.
 *
 * This is the one mode, and it is deliberately narrower than that document:
 *
 *   `free`      the seller absorbs it. Implies they ship manually.
 *   `flat`      a fixed amount the seller sets.
 *   `estimate`  a live address-to-address carrier rate, which the buyer pays
 *               and we HOLD — the escrow flow.
 *
 * Zones and per-kg tables are dropped: once a real carrier quotes the rate, a
 * hand-maintained zone table earns nothing and is one more thing to drift.
 *
 * `freeAbove` SURVIVES as an override on every mode, because "free shipping
 * over ₹999" is a merchandising lever no carrier can give you and every
 * competitor in the crawl uses some form of it.
 */

/** Amounts are decimal rupees throughout, matching every other money field. */
export type StoreShippingMode =
  | { kind: "free" }
  | { kind: "flat"; amount: number }
  | { kind: "estimate" };

export interface StoreShippingPolicy {
  mode: StoreShippingMode;
  /**
   * Order goods value at or above which shipping is free, whatever the mode.
   *
   * 🛑 Compared against the GOODS value, not the grand total. Comparing a
   * free-shipping threshold against a total that already includes shipping,
   * GST and the platform fee makes the threshold depend on itself — a cart can
   * cross ₹999 *because of* the shipping it is about to waive.
   */
  freeAbove?: number;
}

/**
 * The default for a store that has configured nothing.
 *
 * 🛑 `free`, not `estimate`, and that is the conservative choice rather than
 * the generous-looking one. `estimate` means we quote a live carrier rate and
 * hold the buyer's money against a booking the seller may not be set up to
 * make; a store that has never opened its shipping settings has not agreed to
 * that. `free` charges the buyer nothing and leaves the seller shipping
 * manually, which is what an unconfigured store was doing anyway — the old
 * code's `?? 0` had exactly this effect, so this preserves behaviour for every
 * existing store rather than silently switching them into escrow.
 */
export const DEFAULT_STORE_SHIPPING_POLICY: StoreShippingPolicy = {
  mode: { kind: "free" },
};

/**
 * What a STORED policy may look like on the way in — every field optional,
 * every leaf a primitive.
 *
 * 🛑 Declared rather than written inline as `{ kind?: unknown }`.
 * `audit-unknown-leakage` was right to reject that: `unknown` inside a shape
 * is where casts breed, because every read of it needs one. A wire type with
 * real leaf types needs exactly ONE cast — at the parse boundary below, which
 * is what a narrowing function is for — and every read after it is checked.
 */
interface StoreShippingPolicyWire {
  mode?: { kind?: string; amount?: number };
  freeAbove?: number;
}

/** Narrow an arbitrary stored value, falling back to the safe default. */
export function toStoreShippingPolicy(raw: unknown): StoreShippingPolicy {
  if (!raw || typeof raw !== "object") return DEFAULT_STORE_SHIPPING_POLICY;
  const r = raw as StoreShippingPolicyWire;
  const freeAbove =
    typeof r.freeAbove === "number" && r.freeAbove > 0 ? { freeAbove: r.freeAbove } : {};

  const kind = r.mode?.kind;
  if (kind === "estimate") return { mode: { kind: "estimate" }, ...freeAbove };
  if (kind === "flat") {
    const amount = Number(r.mode?.amount ?? 0);
    /*
     * A `flat` mode with no amount is not a flat rate, it is an unfinished
     * form. Treating it as ₹0 would silently make it `free` and hide the
     * misconfiguration; falling back to the default does the same thing
     * VISIBLY, because the seller's settings page will show `free` selected
     * and they can see it is not what they chose.
     */
    if (!(amount > 0)) return { ...DEFAULT_STORE_SHIPPING_POLICY, ...freeAbove };
    return { mode: { kind: "flat", amount }, ...freeAbove };
  }
  return { ...DEFAULT_STORE_SHIPPING_POLICY, ...freeAbove };
}

export interface ShippingQuoteInput {
  policy: StoreShippingPolicy;
  /** GOODS value of this store's lines — see `freeAbove`. */
  goodsValue: number;
  /**
   * The live carrier rate, when one was obtained.
   *
   * `null` means we could not get one — which is NOT the same as zero and is
   * why this is nullable. See `quoteShipping`'s `needsCarrierRate`.
   */
  carrierRate?: number | null;
}

export type ShippingQuote =
  | { kind: "charge"; amount: number; reason: "flat" | "estimate" }
  | { kind: "free"; reason: "mode" | "freeAbove" }
  /**
   * 🛑 The third outcome, and the reason this returns a union rather than a
   * number. An `estimate`-mode store whose carrier rate could not be obtained
   * has NO quote — and a `0` there would ship the parcel for free at our
   * expense, silently, on every order until someone noticed. The caller must
   * decide: block the purchase, or fall back. It cannot accidentally charge
   * nothing.
   */
  | { kind: "unavailable"; reason: "no-carrier-rate" };

/**
 * What this store's lines cost to ship.
 *
 * Order of resolution matters: `freeAbove` is checked FIRST, because a cart
 * over the threshold is free regardless of mode and there is no point
 * obtaining a carrier rate we are about to waive. That also means an
 * `estimate`-mode store with a `freeAbove` does not fail on an unavailable
 * carrier rate for a qualifying cart.
 */
export function quoteShipping(input: ShippingQuoteInput): ShippingQuote {
  const { policy, goodsValue, carrierRate } = input;

  if (policy.freeAbove != null && goodsValue >= policy.freeAbove) {
    return { kind: "free", reason: "freeAbove" };
  }
  switch (policy.mode.kind) {
    case "free":
      return { kind: "free", reason: "mode" };
    case "flat":
      return { kind: "charge", amount: policy.mode.amount, reason: "flat" };
    case "estimate":
      if (typeof carrierRate !== "number" || !(carrierRate >= 0)) {
        return { kind: "unavailable", reason: "no-carrier-rate" };
      }
      return { kind: "charge", amount: carrierRate, reason: "estimate" };
    default: {
      // Exhaustive: a fourth mode must not compile to a silent free shipment.
      const unreachable: never = policy.mode;
      return unreachable;
    }
  }
}

/** Whether this quote needs a carrier call at all — saves a round trip. */
export function needsCarrierRate(
  policy: StoreShippingPolicy,
  goodsValue: number,
): boolean {
  if (policy.freeAbove != null && goodsValue >= policy.freeAbove) return false;
  return policy.mode.kind === "estimate";
}
